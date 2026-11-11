---
description: Record a measured additive usage window.
---

Read CLAUDE.md first. Record a measured additive usage window.

npm run usage -- record --account=<account> --meter=<meter> --from=<ISO-time> --to=<ISO-time> --quantity=<quantity> --ref=<unique-reference>

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
