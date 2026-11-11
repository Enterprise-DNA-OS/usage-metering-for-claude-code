# Usage Metering for Claude Code

Own the usage records behind your customer charges. Keep accounts, additive meters, agreed rates, source exports, corrections and statement reviews in one database.

## Three ways to own it

- **Do it yourself:** MIT source, local embedded database, your own hosting when needed. Use Claude Code, Codex, OpenCode or Cursor with the same command recipes.
- **We customise it:** Enterprise DNA brings your Amberflo usage across, adds your contract rules, connects your sources and builds a screen if your team wants one. One setup fee, then a retainer for ongoing work.
- **We run it for you:** Omni by Enterprise DNA installs and operates your version, with access, backups and ongoing changes. One setup fee, then a retainer. [Book Sam's 30-minute call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=amberflo).

## Start with fictional data

Node 20 or newer. On Windows, use npm.cmd if PowerShell blocks npm.ps1.

```bash
npm install
npm run demo
npm run usage -- attention
npm run view
npm run docs
```

The default is PGlite under `.data/db`. Run one process at a time against that embedded folder. Use PostgreSQL for concurrent operators. `DATABASE_URL` selects PostgreSQL instead. Run `npm run migrate` on an empty working database. Do not seed real accounts with demo data. Shared demo seeding explicitly requires `--demo-database`.

This is an additive usage and charge review desk. Supported rates are a monthly base charge, included units, a first graduated tier and an overage tier. Money is calculated with database decimals and rounded once per meter line to cents. Each account has one fixed currency, and currencies are never added together. Calendar months use UTC. Rate periods start on month boundaries and end exclusively.

No payment collection, tax invoices, tax calculations, revenue recognition, prepaid wallets, production ingestion endpoint or claims of vendor feature parity are included. A snapshot is a reviewable calculation. A person approves a completed month only after source totals and terms have been checked. Work with your accountant and payment provider for the later steps.

## Daily and monthly work

| Command | What it does |
|---|---|
| `/accounts` | Read account owners, currencies and review dates. |
| `/meters` | Read additive meters and their units. |
| `/rates` | Read dated rates and their agreement references. |
| `/usage-round` | Read active usage windows, source references and dimensions. |
| `/monthly-charges` | Review monthly usage and calculated charges by account and currency. |
| `/overages` | Find consumption above included allowances. |
| `/unpriced-usage` | Find usage that has no agreed rate. |
| `/quiet-accounts` | Find active accounts with no usage window ending in seven days. |
| `/usage-trend` | Compare each meter with its previous recorded month. |
| `/dimension-review` | Compare usage by the dimensions actually present in the records. |
| `/owner-workload` | See who owns the most review findings and overdue work. |
| `/issues` | Read open and resolved reconciliation issues. |
| `/issues-due` | Read open issues due within seven days, including overdue work. |
| `/attention` | Run the daily exception round. |
| `/compliance` | Read accuracy, retention and missing-rate findings. |
| `/import-history` | Read import counts, source file names and hashes. |
| `/statements` | Read draft and approved statements. |
| `/void-history` | Read corrections without losing the original usage. |
| `/account` | Read one account before changing its records. |
| `/audit` | Read the change history of one account. |
| `/add` | Add an account, meter or agreed monthly rate. |
| `/record` | Record a measured additive usage window. |
| `/void` | Correct a usage record by preserving it and recording why it is excluded. |
| `/issue` | Assign a reconciliation issue. |
| `/resolve` | Record the evidence that resolves an issue. |
| `/review` | Record an accuracy or retention review date after the review happened. |
| `/log` | Append an operational note. |
| `/draft-statement` | Freeze a monthly usage calculation for review. |
| `/approve` | Record a completed review and lock that account month. |
| `/import` | Import Amberflo additive usage exports with the actual headings mapped. |
| `/export` | Make a complete local export including provenance and review history. |
| `/weekly-review` | Write the Monday usage and reconciliation review. |
| `/draft-usage-letter` | Prepare an account usage explanation for review. |
| `/customise` | Add your fields and rules with a tested migration. |
| `/new-view` | Add a branded read-only report. |

The one CLI is `npm run usage -- <command>`, with `--json` for machines. Exact account codes are case insensitive. Unique name fragments and id prefixes work too. Ambiguous references list candidates and exit 1. [CLI examples](docs/cli.md) include every write.

## Ten questions to ask

These combine local source records, your agreements and your review history. They are executable questions, not a claim that Amberflo cannot build similar reports.

1. Which account has consumption with no agreed rate? `unpriced-usage`
2. Which accounts exceeded their included units? `overages`
3. Which agreed accounts stopped reporting usage? `quiet-accounts`
4. Which owner has the most overdue review work? `owner-workload`
5. How did usage change against the previous recorded month? `usage-trend`
6. Which regions or features account for the recorded consumption? `dimension-review`
7. Which accounts need a retention purpose review? `compliance`
8. Which records were excluded and who explained the correction? `void-history`
9. Which source exports have already been brought across? `import-history`
10. Which monthly calculations are approved and which are still drafts? `statements`

## Your first hour: ten things to ask for

1. Put our business name, colours and logo in brand.json.
2. Add our account codes and owners without importing personal data we do not need.
3. Map the headings in one actual Amberflo usage export.
4. Confirm whether those rows are additive interval totals or individual events.
5. Import a reviewed month and compare its totals to Amberflo.
6. Enter the signed rates, included usage and month boundaries.
7. Assign each unexplained difference to an owner and date.
8. Draft a usage statement and compare every line with the source.
9. Give one team a read-only account review report.
10. Set up a shared database, restricted roles and tested backups before colleagues use it.

## Correctness and switching

[Moving from Amberflo](docs/replace-amberflo.md) explains the one-command mapped CSV import and its boundaries. Raw source rows, batch hashes and mappings are retained. Whole imports roll back on an invalid row. A repeated file is a no-op. Stable source references prevent duplication across files. Overlapping windows for the same account, meter and dimensions are rejected, including overlaps across import sources.

A correction voids a usage record and keeps its history. Approved account months cannot accept new usage, rate cards or voids. Statements hold frozen lines and a fingerprint of their source records. A changed source invalidates a draft even when the total happens to be the same. The approval command only accepts completed calendar months with no open issues and an up-to-date account accuracy review.

Use a trusted administrator for this repository. All tables enable row security with no anonymous policies, but the database owner can alter records and triggers. The audit log is not independent certification. A shared service needs access design, monitoring, secure backups and restore drills. Do not expose the database to customers.

## Documents, views and record checks

`npm run docs` renders frozen usage statements and account review packs as branded HTML. `npm run view` renders the charge review and weekly exception desk. `weekly-review` and `draft-usage-letter` write private drafts. All outputs stay local. Reports are read-only and are printable, with no web server or front end.

[Record checks](docs/compliance.md) tie accuracy and retention reviews to NZ Privacy Act principles when personal information is present. Dates are local policy choices, not statutory deadlines, and a clean check does not certify compliance. [Why no front end](docs/why-no-front-end.md) describes the capture and access boundaries.

## Tests

`npm test` uses a disposable database and output directory. It tests exact decimals, graduated allowances, idempotent imports, malformed CSV, overlapping windows, rollback, stale statement rejection, approved-month locks, ambiguity, history, exports and document escaping. Linux and Windows CI run the same suite. A separate CI job exercises PostgreSQL with the same migrations. Never set the disposable test connection to a working database.

## Licence

MIT. Copyright 2026 Enterprise DNA. This independent project is not affiliated with Amberflo.
