---
description: Correct a usage record by preserving it and recording why it is excluded.
---

Read CLAUDE.md first. Correct a usage record by preserving it and recording why it is excluded.

npm run usage -- void <usage-reference> --actor=<operator> --reason=<reason>

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
