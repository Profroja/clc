"""The flow runtime: moves a conversation through a graph of nodes and edges.

A session's whole position is a small JSON `state`, saved between messages:
    {"flow": <flow id>, "version": <version id>, "node": <node waiting for a reply>,
     "vars": {...answers...}, "stack": [{"flow", "version", "node"}]}   # flows to return to

Flows are looked up through a FlowStore, so the builder's test chat can run a draft while
WhatsApp runs published versions.
"""
from dataclasses import dataclass, field

from .catalog import NODE_TYPES
from .nodes import HANDLERS, Ctx

MAX_STEPS = 60  # protects against a flow that loops forever


class FlowError(Exception):
    """The flow cannot run: missing node, unknown flow, endless loop. Publishing validation
    prevents these; the runtime still refuses to guess."""


@dataclass
class Turn:
    messages: list = field(default_factory=list)
    state: dict | None = None       # None once the session has ended
    ended: str | None = None        # 'completed' | 'handoff'
    trace: list = field(default_factory=list)  # nodes visited, for the builder's test chat

    @property
    def waiting_node(self):
        return self.state['node'] if self.state else None


class Graph:
    def __init__(self, definition):
        nodes = definition.get('nodes', [])
        self.nodes = {n['id']: n for n in nodes}
        self.edges = {(e['source'], e.get('sourceHandle') or 'next'): e['target'] for e in definition.get('edges', [])}
        self.start = next((n['id'] for n in nodes if n.get('type') == 'start'), None)

    def after(self, node_id, port):
        return self.edges.get((node_id, port)) if port else None


class FlowStore:
    def current(self, flow_id):
        """(version_id, definition) that a new run of this flow should use, or None."""
        raise NotImplementedError

    def version(self, flow_id, version_id):
        """The definition of a version a session is already pinned to, or None."""
        raise NotImplementedError


class Runtime:
    def __init__(self, store, effects):
        self.store = store
        self.effects = effects
        self._graphs = {}

    def _current(self, flow_id):
        found = self.store.current(flow_id)
        if not found:
            raise FlowError(f'Flow {flow_id} has no version that can run')
        version_id, definition = str(found[0]), found[1]
        self._graphs.setdefault((str(flow_id), version_id), Graph(definition))
        return version_id, self._graphs[(str(flow_id), version_id)]

    def _graph(self, flow_id, version_id):
        key = (str(flow_id), str(version_id))
        if key not in self._graphs:
            definition = self.store.version(flow_id, version_id)
            if definition is None:
                raise FlowError(f'Version {version_id} of flow {flow_id} is gone')
            self._graphs[key] = Graph(definition)
        return None, self._graphs[key]

    # --- public -----------------------------------------------------------
    def start(self, flow_id, variables=None):
        version_id, graph = self._current(flow_id)
        if not graph.start:
            raise FlowError('Flow has no Start node')
        state = {'flow': str(flow_id), 'version': str(version_id), 'node': None,
                 'vars': dict(variables or {}), 'stack': []}
        turn = Turn()
        self._run(state, graph.start, turn)
        return turn

    def receive(self, state, event):
        """event: {"kind": "text", "text"} | {"kind": "choice", "choice_id"} |
                  {"kind": "file", "file": {...}} | {"kind": "other"}"""
        state = {**state, 'vars': dict(state.get('vars') or {}), 'stack': list(state.get('stack') or [])}
        _, graph = self._graph(state['flow'], state['version'])
        node = graph.nodes.get(state.get('node'))
        if node is None or not waits(node.get('type')):
            raise FlowError('The session is not waiting at a node')
        turn = Turn(trace=[node['id']])
        step = HANDLERS[node['type']].receive(node, Ctx(state['vars'], self.effects), event)
        turn.messages.extend(step.messages)
        if step.wait:
            turn.state = state
            return turn
        self._run(state, graph.after(node['id'], step.port), turn)
        return turn

    # --- the loop -----------------------------------------------------------
    def _run(self, state, node_id, turn):
        for _ in range(MAX_STEPS):
            _, graph = self._graph(state['flow'], state['version'])
            if node_id is None:  # this branch has no next node
                if not state['stack']:
                    turn.state, turn.ended = None, 'completed'
                    return
                frame = state['stack'].pop()  # back to the flow that called "Go to flow"
                state['flow'], state['version'] = frame['flow'], frame['version']
                _, parent = self._graph(state['flow'], state['version'])
                node_id = parent.after(frame['node'], 'next')
                continue

            node = graph.nodes.get(node_id)
            if node is None or node.get('type') not in HANDLERS:
                raise FlowError(f'Unknown node {node_id}')
            turn.trace.append(node_id)
            step = HANDLERS[node['type']].enter(node, Ctx(state['vars'], self.effects))
            turn.messages.extend(step.messages)

            if step.end:
                turn.state, turn.ended = None, step.end
                return
            if step.wait:
                state['node'] = node_id
                turn.state = state
                return
            if step.goto_flow:
                if len(state['stack']) >= 10 or step.goto_flow in {f['flow'] for f in state['stack']} | {state['flow']}:
                    raise FlowError('"Go to flow" would loop back into a flow that is already running')
                state['stack'].append({'flow': state['flow'], 'version': state['version'], 'node': node_id})
                version_id, target = self._current(step.goto_flow)
                state['flow'], state['version'] = str(step.goto_flow), str(version_id)
                node_id = target.start
                continue
            node_id = graph.after(node_id, step.port)
        raise FlowError(f'Flow ran more than {MAX_STEPS} steps without waiting for the client')


def waits(node_type):
    return NODE_TYPES.get(node_type, {}).get('waits', False)
