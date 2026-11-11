# Record checks and their sources

Checked 11 November 2026. This command checks records and local review policies. It does not certify legal compliance or decide tax, payments or revenue recognition.

| Rule | What the command checks | Basis |
|---|---|---|
| REVIEW | The account accuracy review date is overdue. | Local review schedule supporting NZ Privacy Act IPP8 when the account or usage includes personal information. |
| RETENTION | The account retention purpose review date is overdue. | Local review schedule supporting NZ Privacy Act IPP9 when personal information is held. |
| RATE | An account and meter month has consumption without an agreed rate. | Local reconciliation control, not a statutory test. |

The [Office of the Privacy Commissioner on IPP8](https://www.privacy.org.nz/privacy-principles/8/) explains checking information quality before use or disclosure. [IPP9](https://www.privacy.org.nz/privacy-principles/9/) addresses retention for lawful purposes. Neither source prescribes the review intervals in this demo. Both apply to personal information, not every anonymous count.

An operator chooses dates based on the actual purpose and other record duties. The software reports overdue reviews and makes no automatic deletion. Review source files, dimensions, drafts, exports and backups too. An immutable operational history is not a reason to retain personal information forever. A deployment needs an explicit retention and removal procedure with its administrator.

Amberflo's [metering guidance](https://amberflo.io/blog/best-practices-for-metering-cloud-resources) distinguishes additive event counts from duration and other measures. This version accepts already measured additive quantities. It does not infer durations from start/stop records or sum storage snapshots as though they were consumption.

Local controls also reject overlapping measurement windows, source reference conflicts, invalid decimals and usage changes in approved months. Statement approval requires a completed calendar month, no open issues, an accuracy review that is not overdue and a fingerprint matching current source records. The reviewer records the reconciliation evidence. The command cannot tell whether the person actually checked that evidence.

The database owner can change triggers and audit records outside the CLI. Authentication, backups, access reviews and independent audit evidence belong to the deployment. This is not an electronic signature service or a certified financial ledger.
