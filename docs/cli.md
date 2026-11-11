# CLI reference

Every command accepts `--json`. Options use `--key=value`, so quote the whole option when it contains spaces. All times require ISO timestamps with an explicit offset. Months are `YYYY-MM-01`. Windows end exclusively. Date examples below are fictional.

```bash
npm run usage -- add account --code=ACME --name="Example Software" --owner=Alex --currency=NZD --review-on=2027-01-01 --retention-on=2027-01-01
npm run usage -- add meter --code=api_calls --name="Completed calls" --unit=calls
npm run usage -- add rate --account=ACME --meter=api_calls --from=2026-10-01 --to=2027-01-01 --included=1000 --tier=9000 --price=0.01 --overage-price=0.005 --base-cents=2500 --evidence="Signed schedule A"
npm run usage -- record --account=ACME --meter=api_calls --from=2026-10-01T00:00:00Z --to=2026-10-02T00:00:00Z --quantity=15000 --ref=acme-20261001
npm run usage -- issue --account=ACME --title="Reconcile export" --owner=Alex --due=2026-11-12
npm run usage -- resolve <issue-id> --actor=Alex --reason="Compared source units"
npm run usage -- review ACME --on=2027-01-01 --retention-on=2027-01-01 --owner=Alex
npm run usage -- log ACME --actor=Alex --text="Source period reconciled"
npm run usage -- draft-statement ACME --month=2026-10-01 --actor=Alex
npm run docs -- usage-statement <statement-id>
npm run usage -- approve <statement-id> --actor=Alex --evidence="Source file and signed rate compared"
npm run usage -- draft-usage-letter ACME --month=2026-10-01
npm run usage -- weekly-review
npm run usage -- export --out=review-backup
```

A flat per-unit rate uses `--tier=0`, `--price=0` and the rate in `--overage-price`. Graduated rates apply `tier` units after the included allowance at `price`; the remaining units use `overage-price`. The monthly base is in cents. Unit rates are in the account currency, with up to six decimal places. There is no proration. Add a new finite rate period for a new agreement. Rate cards are immutable and must not overlap, so use an agreed end date when future changes are expected. A future migration can introduce an audited rate-termination workflow; never overwrite historic rates by hand.

Before a month is approved, correct a record with:

```bash
npm run usage -- void <usage-id-or-source-reference> --actor=Alex --reason="Duplicate source window"
```

Then add the corrected usage under a new stable reference. Approved periods cannot be changed through these commands. They require a separately reviewed correction process, not an automatic reopen.

The reads are listed by `npm run usage -- help`. `account <reference>` shows one account and its agreements and notes. `audit <account>` shows inserts and updates with before/after records. The free base has one trusted operator role; approval records identify a named operator but do not authenticate their identity independently.
