---
description: Prepare an account usage explanation for review.
---

Read CLAUDE.md first. Prepare an account usage explanation for review.

npm run usage -- draft-usage-letter <account> --month=<YYYY-MM-01>
Read the result and show the draft. This is not a tax invoice or payment request. Never send it.

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
