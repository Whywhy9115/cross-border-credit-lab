# White Paper Alignment

## Economic Problem

The white paper describes a credit portability problem: when a consumer moves between countries, their credit history may not transfer into the new country's reporting system. A financially responsible borrower can become effectively credit invisible, which can raise borrowing costs, reduce credit limits, and make housing or financial access harder.

The demo models this problem with Alice, a borrower who has one blockchain identity and receives records from both Canadian and United States institutions.

## How The Blockchain Applies

### Persistent Identity

The contract lets Alice register a `bytes32 identityHash` once. In a real system, the hash would represent a decentralized identity or verified credential reference. The important point for the demo is that the identity is not tied to only one national bureau.

Relevant code:

- `registerBorrower`
- `Borrower.identityHash`

### Permissioned Data Submission

Only the regulator owner can authorize institutions. Only active institutions can call `submitCreditRecord`.

Relevant code:

- `authorizeInstitution`
- `deactivateInstitution`
- `onlyActiveInstitution`

This maps to the white paper's requirement that banks, credit card issuers, or recognized bureaus can submit data, while random users cannot create fake credit records.

### Append-Only Credit History

The contract never edits a prior credit record's core facts. A correction creates a new record that references the earlier record through `previousRecordId`.

Relevant code:

- `_appendCreditRecord`
- `CreditRecord.previousRecordId`
- `resolveDispute`

This demonstrates the auditability benefit of a blockchain ledger: viewers can see both the original report and the later correction.

### Dispute Workflow

The borrower can dispute a record with `openDispute`. The institution that created the original record can resolve it with `resolveDispute`.

Relevant code:

- `openDispute`
- `resolveDispute`
- `Dispute.status`
- `Dispute.correctionRecordId`

This maps to the white paper's goal of creating a mechanism for correcting disputed records and tracking who can update them.

## What The Demo Does Not Solve

This prototype intentionally avoids storing full financial documents on-chain. Real financial data would need encryption, privacy controls, off-chain storage, legal compliance, and governance across institutions and countries.

This prototype also does not calculate a universal credit score. It creates the permissioned record and correction infrastructure that a scoring model could use later.

