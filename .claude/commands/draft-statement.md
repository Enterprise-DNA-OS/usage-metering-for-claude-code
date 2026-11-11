---
description: Freeze a monthly usage calculation for review.
---

Read CLAUDE.md first. Freeze a monthly usage calculation for review.

npm run usage -- draft-statement <account> --month=<YYYY-MM-01> --actor=<operator>
Then run npm run docs -- usage-statement <returned-id>. Show the document and its draft status.

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
