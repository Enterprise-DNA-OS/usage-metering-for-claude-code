# Move additive usage records from Amberflo

Amberflo [documents CSV export of meter usage](https://amberflo.io/blog/newsletter-highlights-may-12), including sorting by meter, customer or dimension. Its [platform page](https://amberflo.io/platform-old) also describes data exports. The public export announcement does not establish a single fixed header layout. The mapping below is a fictional example, not a claim about the headings in your account.

## Prepare one export

In your Amberflo account, export the required meter usage and retain the original file. Check the period, timezone, aggregation, account filters and dimensions. Export additive sums over nonoverlapping windows. If the export only contains snapshots, distinct counts or durations that need calculation, stop and map the underlying events first. Do not sum those values as consumption. Do not combine overall totals with their component dimension rows. The importer cannot detect that semantic double count.

Create the accounts and meters with the exact identifiers in the export, using `/add`. Keep currencies and contract rates separate: usage exports do not establish agreed prices. Use a clean working database, never the demo database, for your own records.

Map the actual headings with a JSON file. Every mapped value names an actual CSV column:

```json
{
  "account": "Customer ID",
  "meter": "Meter",
  "from": "Window Start",
  "to": "Window End",
  "quantity": "Usage",
  "reference": "Usage Reference",
  "dimensions": "Dimensions"
}
```

Each row needs an account, meter, explicit start and exclusive end with timezone, decimal quantity and stable source reference. Dimensions, when mapped, must be a JSON object. Omit the dimensions mapping only if the export is not divided by dimensions. If the export lacks window bounds or references, derive them from the documented export query and retain that mapping record; do not guess them. A stable reference can be the account, meter, window and dimension key when each combination has one row. Reuse the same reference in later exports. Split a window crossing a UTC month boundary at the source, not by estimating a proportion.

## One-command import

```bash
npm run usage -- import amberflo imports/usage.csv --map=imports/mapping.json --dry-run
npm run usage -- import amberflo imports/usage.csv --map=imports/mapping.json
```

Both commands perform the same validation. The first rolls back. The second retains the raw source row, mapping, file hash and counts. A bad row rolls the entire file back. Repeating a file does nothing. Reusing a reference with different data fails. Two windows for the same account, meter and dimension set cannot overlap even across different sources. Re-exporting at a different aggregation level requires reconciliation before import, not an automatic overwrite.

The fixture in `tests/fixtures` is fictional and demonstrates mapping. It is not an Amberflo-provided fixture. The importer has been tested against that documented mapping contract, not a customer's authenticated Amberflo export.

## Reconcile before switching

Compare units by account, meter, period and dimension. Compare row counts, the earliest and latest timestamps and missing accounts. Record any differences as issues. Enter dated rates from signed agreements, run monthly charges, draft a statement and compare every amount. Run both systems until the source coverage and calculations agree. One import command is not a promise that every migration fits in a day.

Usage exports do not bring over signed contracts, invoice/payment history, tax treatment, subscriptions, prepaid credits, duration-meter state, integrations or dashboards. This free base handles additive usage, monthly base fees, included units and two graduated tiers. Enterprise DNA maps the broader operating requirements as part of a scoped custom version. Your accountant and payment provider keep the financial responsibilities outside this desk.

`npm run usage -- export --out=backup-name` writes all stored records, raw source rows, rate cards, notes, voids, statements, approvals and audit history plus a SHA-256 manifest. Preserve the original exports and deployment configuration as well. The JSON export is a portable record archive, not a PostgreSQL physical backup or a one-command restore tool.
