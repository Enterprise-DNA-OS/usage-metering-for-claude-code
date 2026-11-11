---
description: Make a complete local export including provenance and review history.
---

Read CLAUDE.md first. Make a complete local export including provenance and review history.

npm run usage -- export --out=<new-folder-name>
Show the local folder and manifest hash. Never upload it.

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
