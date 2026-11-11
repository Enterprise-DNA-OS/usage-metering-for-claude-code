---
description: Import Amberflo additive usage exports with the actual headings mapped.
---

Read CLAUDE.md first. Import Amberflo additive usage exports with the actual headings mapped.

Read docs/replace-amberflo.md. Run npm run usage -- import amberflo <export.csv> --map=<mapping.json> --dry-run. Review counts, units and date coverage, then repeat without --dry-run within the operator's authorised import.

Use --json when inspecting data. Preserve source references and currencies. If a reference is ambiguous, show the candidates and ask which one. Never pick the first match. Report facts and unresolved findings separately. No messages, invoices or payments leave this system.
