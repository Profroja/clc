# CLC WhatsApp chatbot engine

The `chatbot` app runs CLC's WhatsApp bot. CLC Admins build what the bot says and asks in the
dashboard (**Admin → Chatbot flows**). The engine then runs those flows for every client who
messages CLC's WhatsApp number.

## Setup

```bash
cd clcBackend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py import_landbot --media-dir ../docs/landbot/media   # CLC's bot, rebuilt from Landbot
python manage.py runserver
```

Put these settings in `clcBackend/.env`:

| Variable | What it is |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | The Phone number ID in Meta → WhatsApp → API Setup |
| `WHATSAPP_TOKEN` | A permanent System User access token with `whatsapp_business_messaging` |
| `WHATSAPP_VERIFY_TOKEN` | Any secret string. Enter the same value in Meta's webhook settings |
| `META_APP_SECRET` | App settings → Basic → App secret. It is used to check each webhook signature |
| `GRAPH_API_VERSION` | Optional. Defaults to `v23.0` |
| `STORAGE_DIR` | Optional. The folder for documents clients send and the bot's files. Defaults to `storage/` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` | SMTP for **Notify staff** emails. Without `EMAIL_HOST` they are printed to the console |
| `DEFAULT_FROM_EMAIL` | Sender of those emails, e.g. `CLC WhatsApp bot <no-reply@clc.tz>` |

### Connecting Meta

1. In the Meta app, go to WhatsApp → Configuration → Webhook. Set the callback URL to
   `https://<your-domain>/api/whatsapp/webhook/` and the verify token to `WHATSAPP_VERIFY_TOKEN`.
2. Subscribe to the **messages** field.
3. Meta must reach the server over public HTTPS. For local testing, use a tunnel such as
   `cloudflared` or `ngrok`.

Every POST must carry a valid `X-Hub-Signature-256` header, or the webhook rejects it.

## How a message is handled

1. The webhook stores the incoming message. Duplicates are ignored by Meta message id. The webhook
   finds or creates the client by phone number and finds or opens the conversation.
2. If the client has an open case that a person is handling, the bot stays quiet. The message (and
   any file) goes to the case.
3. Otherwise, the engine continues the client's bot session. A new session starts from the
   matching flow trigger in these cases:
   - the client has no session,
   - the session has been idle for 24 hours,
   - the client types `menu`, `menyu`, `菜单` or `#`.
4. Replies are queued as `Message` rows and sent to Meta after the database transaction commits.
   Delivery and read receipts update the row and never move its status backwards.

A session stays on the flow version it started with. Publishing a change never breaks a
conversation that is already under way.

## Building flows (Admin → Chatbot flows)

- **Blocks**:
  - Say: Message, Send file or image.
  - Ask: Question, Buttons (up to 3), List (up to 10), File upload.
  - Logic: Condition, Set variable, Business hours (Open / Closed exits), Go to flow.
  - CLC system: Create case, Notify staff (email), Case status, Hand over to a person.
  - Finish: End.

  A Buttons or List block that saves its answer as `service` also sets `{{service_label}}`, the title
  the client tapped, in their language.

  Every text has a Swahili, English and Chinese version. `{{full_name}}` inserts a saved answer.
- **Triggers** (Flow settings) decide what starts a flow:
  - *New conversation* starts the flow when a client has no running session.
  - *Keyword* starts the flow on exact or contains matches.

  When several triggers match, the one with the lowest priority number wins.
- **Test chat** runs the flow on the canvas, including unsaved edits, without sending anything to
  WhatsApp. Effects such as "case created" appear as grey system lines.
- **Saving and publishing**:
  - Edits autosave to a draft, and clients keep seeing the published version.
  - **Publish** checks the flow first. Errors block publishing, for example an unconnected exit
    or text that is too long for WhatsApp. Warnings don't block it.
  - Every published version is kept, and *Versions* can restore any of them as a new draft.
- A published flow can't be deleted, only switched off. That keeps the conversation history meaningful.

- **Bot files** (on the Chatbot flows page): pictures and PDFs the *Send file* block sends. Replacing a
  file there updates every flow that sends it. Files are uploaded to Meta once and reused for 25 days.
- **Bot settings**: opening hours (East Africa Time, plus public holidays) used by every *Business hours*
  block, and the staff emails *Notify staff* uses when a block names no one.

### CLC's bot (rebuilt from Landbot)

`import_landbot` loads three published flows from `chatbot/landbot.py` (source: `docs/landbot/`):

| Flow | What it does |
|---|---|
| CLC WhatsApp bot | Hours check, welcome, language, menu: TSA / Legal services (8) / Kiapo cha Majina. Starts every new conversation |
| Kiapo cha Majina | NSSF, NIDA (5 topics) and NECTA name changes. Kiswahili only |
| Connect to staff or leave a message | Where every request ends. Open: case + email + handover. Closed: the client leaves a message, then case + email |

Files missing from `--media-dir` get placeholders marked *Replace me* in Bot files; running the command
again with the files swaps them in.

### Adding a new block type

1. Describe it in `catalog.py`: its fields, its exits and its icon. The builder draws the palette
   and the settings panel from this catalog.
2. Add a handler in `nodes.py`. If the block needs to reach the database, add a method to
   `Effects` (`effects.py`, plus `live.py` for the real implementation).

## API (CLC Admin, "Working as" CLC Admin)

| Method | Path | |
|---|---|---|
| GET | `/api/chatbot/node-types/` | Block catalog for the builder |
| GET, POST | `/api/chatbot/flows/` | List / create |
| GET, PATCH, DELETE | `/api/chatbot/flows/<id>/` | Open; rename, switch on/off, triggers; delete if never published |
| PUT | `/api/chatbot/flows/<id>/draft/` | Save the draft (returns validation issues) |
| POST | `/api/chatbot/flows/<id>/validate/` | Check without saving |
| POST | `/api/chatbot/flows/<id>/publish/` | Publish the draft |
| GET | `/api/chatbot/flows/<id>/versions/` | Version history |
| POST | `/api/chatbot/flows/<id>/versions/<vid>/restore/` | Copy a version into the draft |
| POST | `/api/chatbot/flows/<id>/simulate/` | Test chat (`hours`: `open` / `closed` to pretend) |
| GET, POST | `/api/chatbot/media/` | Bot files: list / upload (multipart `file`, `name`) |
| PATCH, POST, DELETE | `/api/chatbot/media/<id>/` | Rename / replace the file / delete (refused while a flow sends it) |
| GET, PUT | `/api/chatbot/settings/` | Opening hours and staff emails |
| GET, POST | `/api/whatsapp/webhook/` | Meta verification / incoming events |

Builder actions are written to `activity_events` under the admin's session.

## Tests

```bash
python manage.py test chatbot
```

## Not built yet

- A Conversations inbox in the dashboard. Handover queues the chat, but staff cannot reply from the
  dashboard yet; the Notify staff email includes a wa.me link to reach the client meanwhile.

- Triggers for events (for example "case status changed") and schedules. The engine has a place
  for them (`TriggerType`).
- WhatsApp template messages. Meta only allows free-form replies within 24 hours of the client's
  last message. Messages that CLC starts later need approved templates.
- An opt-in/consent flow and an opt-out keyword (STOP).
- Sending outbound messages through a task queue (Celery/RQ) with retries. Today they are sent
  inline after commit.
