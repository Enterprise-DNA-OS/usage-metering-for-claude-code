# Usage Metering for Claude Code

This is a usage and charge review desk for software businesses. Ask the operator for their role and company before replacing fictional demo records. Read the relevant command in `.claude/commands` before acting.

## Rules

- Run one process at a time against embedded PGlite storage. Use PostgreSQL for concurrent operators.
- Every answer starts with a CLI read. Never invent usage, rates, dates, source references or reviewer names.
- Keep records private. Never send a letter, issue an invoice, collect a payment, publish a report or contact a customer.
- The database calculates additive usage and reviewable charges only. It does not calculate tax or determine accounting treatment.
- UTC calendar months and decimal quantities are required. Rates only change at month boundaries. Never silently round imported units or infer a missing timezone.
- Read docs/replace-amberflo.md before imports. Use the actual headings and stable source references. A source window must be additive and nonoverlapping for its account, meter and dimension set.
- Use a dry run and compare counts, totals, coverage and currencies before relying on an import. Preserve the source export separately.
- Never change immutable records or bypass period locks. Void an unapproved record and add its replacement. Escalate approved-period corrections for an explicit, reviewed accounting process.
- Only record approval when the operator explicitly says they completed the review. Drafting is not approval.
- Compliance findings are record checks. Read docs/compliance.md. They are not legal certification.
- Resolve ambiguity by listing candidates. Never pick one arbitrarily.
- Run npm test after changing behaviour. Tests set DATABASE_URL empty and use disposable storage unless an explicit USAGE_TEST_POSTGRES_URL is supplied for an empty test database.
- Do not seed a working database. Keep private imports in imports/, exports in exports/, and generated drafts out of Git.

## One path per job

- `accounts`: read `.claude/commands/accounts.md`. Read account owners, currencies and review dates.
- `meters`: read `.claude/commands/meters.md`. Read additive meters and their units.
- `rates`: read `.claude/commands/rates.md`. Read dated rates and their agreement references.
- `usage-round`: read `.claude/commands/usage-round.md`. Read active usage windows, source references and dimensions.
- `monthly-charges`: read `.claude/commands/monthly-charges.md`. Review monthly usage and calculated charges by account and currency.
- `overages`: read `.claude/commands/overages.md`. Find consumption above included allowances.
- `unpriced-usage`: read `.claude/commands/unpriced-usage.md`. Find usage that has no agreed rate.
- `quiet-accounts`: read `.claude/commands/quiet-accounts.md`. Find active accounts with no usage window ending in seven days.
- `usage-trend`: read `.claude/commands/usage-trend.md`. Compare each meter with its previous recorded month.
- `dimension-review`: read `.claude/commands/dimension-review.md`. Compare usage by the dimensions actually present in the records.
- `owner-workload`: read `.claude/commands/owner-workload.md`. See who owns the most review findings and overdue work.
- `issues`: read `.claude/commands/issues.md`. Read open and resolved reconciliation issues.
- `issues-due`: read `.claude/commands/issues-due.md`. Read open issues due within seven days, including overdue work.
- `attention`: read `.claude/commands/attention.md`. Run the daily exception round.
- `compliance`: read `.claude/commands/compliance.md`. Read accuracy, retention and missing-rate findings.
- `import-history`: read `.claude/commands/import-history.md`. Read import counts, source file names and hashes.
- `statements`: read `.claude/commands/statements.md`. Read draft and approved statements.
- `void-history`: read `.claude/commands/void-history.md`. Read corrections without losing the original usage.
- `account`: read `.claude/commands/account.md`. Read one account before changing its records.
- `audit`: read `.claude/commands/audit.md`. Read the change history of one account.
- `add`: read `.claude/commands/add.md`. Add an account, meter or agreed monthly rate.
- `record`: read `.claude/commands/record.md`. Record a measured additive usage window.
- `void`: read `.claude/commands/void.md`. Correct a usage record by preserving it and recording why it is excluded.
- `issue`: read `.claude/commands/issue.md`. Assign a reconciliation issue.
- `resolve`: read `.claude/commands/resolve.md`. Record the evidence that resolves an issue.
- `review`: read `.claude/commands/review.md`. Record an accuracy or retention review date after the review happened.
- `log`: read `.claude/commands/log.md`. Append an operational note.
- `draft-statement`: read `.claude/commands/draft-statement.md`. Freeze a monthly usage calculation for review.
- `approve`: read `.claude/commands/approve.md`. Record a completed review and lock that account month.
- `import`: read `.claude/commands/import.md`. Import Amberflo additive usage exports with the actual headings mapped.
- `export`: read `.claude/commands/export.md`. Make a complete local export including provenance and review history.
- `weekly-review`: read `.claude/commands/weekly-review.md`. Write the Monday usage and reconciliation review.
- `draft-usage-letter`: read `.claude/commands/draft-usage-letter.md`. Prepare an account usage explanation for review.

- Custom fields or rules: `/customise`.
- A read-only report: `/new-view`.

## Files and access

`scripts/usage.mjs` is the one CLI. Migrations are in `supabase/migrations`. `supabase/seed.sql` is fictional demo data. `brand.json` supplies the report identity. `DATABASE_URL` selects Postgres, otherwise PGlite stores data locally. Both use the same schema and view calculations. There is no hosted API or customer login. Shared deployment requires a trusted role and backup design.

Omni by Enterprise DNA: https://enterprisedna.co/omni/instead-of/amberflo
