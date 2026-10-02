# Landbot bot "LEGAL SERVICES - 2025/2026" — rebuild reference

Source: Landbot bot 3177418 (WhatsApp channel "community_legal_clinic (CLC)", +255 745 118 253).
Read on 2026-10-02 from the builder's published diagram.

`legal-services-2025-2026.flow.txt` is the full flow in readable form: every block with its
text, buttons/list rows, saved variable and exits (`=> port -> target`). Variables are written
`{{name}}`. Landbot "bricks" (sub-flows) are listed after the main flow; a `[brick]` block jumps
to the brick with that id.

## Size

284 blocks: 63 reply buttons, 8 list menus, 35 messages, 24 text questions, 26 set-variable,
23 business-hours checks, 43 emails to staff, 23 human handovers, 16 goodbyes, 11 bricks.
198 are reachable from the start. The 74 unreachable ones are the English name-change branch
(DEEDPOLL ISSUES → NSSF PROCCED / NIDA ISSUES / WANAHITAJI GAZETI) and most of Brick #5;
nothing links to them (main-flow block `NH_aXYwXw` → DEEDPOLL brick has no incoming link).

Variables: `name` (WhatsApp name), `technical_support_application`, `selected_legal_service`,
`leave_chatormessage`, `user_message`, `deedpoll_viapo`, plus Landbot's `uuid`.

## Shape of the conversation

1. **Business-hours check** (Africa/Dar_es_Salaam; Mon–Fri 09:00–16:00, Sat 09:00–13:00).
   Both paths send the CLC logo + "WELCOME TO COMMUNITY LEGAL CLINIC", then a language pick
   (1️⃣ English / 2️⃣ Kiswahili).
2. **Closed** → "team is offline" (EN or SW) with *Leave a message* / *Leave chat*.
   Message → free-text `user_message` → email to staff. Leave chat → goodbye with the WhatsApp
   channel link.
3. **Open, English** → main menu: TSA / Legal Services / Kiapo cha Majina.
   - **TSA**: intro → "View Proposal" → image + TSA proposal text + PDF → "Discuss with an expert?"
     YES → "connecting you" → hours check → handover (or leave-message + email); NO → goodbye.
   - **Legal Services**: 8-row list (Land, Work Permits, PML/PL transfer, Will, Company
     registration, Annual returns, Mining licences, Other). Invalid reply → re-ask, then "last
     attempt", then *Talk to support / End chat*.
     - Will → free Will template PDF first, then continues like the others.
     - Rows 1–7 → "Proceed?" → appointment type: **Virtual/phone – free** (Calendly
       https://calendly.com/legalclinicclc/10min + meeting policy) or **Physical – paid**
       (image + offices in Dar es Salaam and Dodoma). Each → hours check → in hours: email staff +
       handover; out of hours: leave-message + email.
     - Other → "describe your issue" → hours check → email + handover / leave-message.
   - **Kiapo cha Majina** → "this service is Swahili only" → jumps to the Kiswahili brick.
4. **Open, Kiswahili** (brick "KISWAHILI") mirrors the English menu (TSA / Huduma za Sheria /
   Kiapo cha Majina) with Swahili text and its own PDFs. Its hours checks use a different
   schedule (Mon/Wed–Fri 09:00–18:00, **Tue 09:00–23:30**, Sat 09:00–13:00).
   **Kiapo cha Majina** asks which area: NSSF / NIDA / Vyeti (NECTA).
   - NSSF: what a deed poll needs (3 passport photos, both IDs) → phone-free / office-paid.
   - NIDA: 5-row list (name change, correct info, date of birth, fraud cases, public servants),
     each a NIDA guidance text with a Yes/No; leads to NIDA customer-care contacts, an
     appointment choice, or a goodbye.
   - Vyeti: NECTA guideline PDF → "did that help?" → goodbye, or describe need → hours check.

## Staff notifications and handover

Every lead ends in an **email** (43 variants, EN and SW, subject says in/out of hours and the
path taken) to godfreynjale@clc.tz + dicksonmdumula@clc.tz (some bricks use
godfrey.aloyce@clctz.org + dickson.mdumula@clctz.org), containing `user_message` and a link to
the Landbot chat; in hours it then **hands over** to a Landbot agent group.

## Mapping onto the CLC flow builder

| Landbot | CLC block |
|---|---|
| reply_buttons (≤3) | `ask_buttons` |
| list | `ask_list` |
| var_text | `ask_text` |
| chat (text) | `message` |
| set_a_variable | `set_variable` (most here just re-save the same value and can be dropped) |
| brick | separate flow + `go_to_flow` |
| human_takeover | `handover` |
| goodbye | `end` |
| EN/SW duplicate branches | one flow with `text_i18n` fields keyed on `lang` |

No CLC block yet for: **business-hours check**, **staff email**, and **media/file messages**
(the logo/office images and the TSA, Will, NECTA and NIDA PDFs). Lead capture could become
`create_case` instead of an email.

Media URLs used (Landbot storage — download and re-host before Landbot is turned off):
- TSA proposal PDF (EN) …/VL4PXV4O8ACADCOQBE2Z6M2570DTLA8G.pdf, (SW) …/O7NDEDOYP9BV1RTGCT1M4GOMWRUT5BXF.pdf
- Will template PDF …/DZAU2KDO4G2JVAD4V6JNAKR9KCIZQLED.pdf
- NECTA guideline PDF …/1F8P02LLPQ4NCGROWCH6D4J2VAVHFLS3.pdf, NECTA (EN) …/0SJKOPQ92B6P7TFE7EKZUP02A6NMZ4KE.pdf
- Images: …/POMWRY0T6W0TZUEVQU2HLK62F6M0MN9B.png, …/KJ13UW0ZQ8Y84IFUL13Y9QLZ6UXKY68P.png (welcome),
  …/QP73X467P2PCU9XPQUG9V39SBVY07XD1.jpg (TSA), …/V1LSLFIZSMM9ZMFKQS50OP0MMJE0AMJ9.png (offices)

(prefix: https://storage.googleapis.com/media.landbot.io/421418/channels/)

## Quirks worth fixing in the rebuild

- Offline text says Mon–Fri until 6 PM, but the English hours checks close at 16:00.
- Kiswahili hours allow Tuesday until 23:30 (looks like a test value left in).
- Some in-hours paths email `user_message` without ever asking for it.
- Typos in buttons: "Virsual - Free", "End Chat 🔚\"".
