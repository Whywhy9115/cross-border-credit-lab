# Cross-Border Credit Registry

A local Solidity and Hardhat prototype follows one synthetic borrower across a Canadian lender and a U.S. lender. Both institutions use the same borrower wallet. The regulator authorizes institutions, the borrower can challenge a record, and only its active issuer can resolve that challenge.

## Run locally

With Node.js 22.19.0, run these commands from the project directory. The lockfile pins Hardhat 2.29.2. The configuration uses Solidity 0.8.24 with via-IR and 200 optimizer runs.

```sh
npm ci
npm run compile
npm test
npm run demo
npx hardhat run scripts/captureTrace.js
```

Each demo starts a fresh local chain. The capture script writes its full trace, an excerpt, and JSON metadata to the parent directory. Compare record IDs, values, and links across runs. For a shorter state inspection, run `npm run state`.

## Reading a correction

The Canadian lender enters a score change of +45 on record 1. When it accepts the dispute, it appends record 2 with +60 and a link back to record 1. Record 1 retains +45. The U.S. lender then appends record 3. A reader can follow the correction link to avoid counting the repayment twice.

## Dispute rules and verification

Eight automated tests cover authorization, cross-border history, unauthorized submissions, accepted corrections, issuer-only resolution, and these three cases:

- **Rejection.** The original record and borrower history survive, the dispute closes without a correction, and the borrower cannot reopen that ID with new evidence.
- **Disputing a correction.** The borrower can challenge record 2 under its own ID. The accepted decision on record 1 and its link to record 2 are preserved.
- **Issuer deactivation.** A pending dispute stays open. Another active lender cannot take it over. The original lender can resolve it once the regulator reauthorizes its address.

The separate demo trace records nine successful transactions and checks seven expected reverts with `eth_call`. The contract makes authorship and correction history inspectable. The issuer still determines whether the underlying credit event is accurate. Records are publicly readable, so the demo uses synthetic data and document references.

## Source

- `contracts/CrossBorderCreditRegistry.sol` implements the registry.
- `test/CrossBorderCreditRegistry.js` exercises contract behavior on a local chain.
- `scripts/runDemo.js`, `scripts/showState.js`, and `scripts/captureTrace.js` run the scenario, inspect state, and capture receipts and checks.
