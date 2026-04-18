# Cross-Border Credit Registry Code Demo

## Carnegie Mellon University
### Developing Blockchain Use Cases
### Final Project Code Demo Lab
### Deliverable: a working GitHub repository and a 5-10 minute video walkthrough

## Learning Objectives

This code demo implements the blockchain portion of the white paper idea: a portable credit history system for people who move across the United States and Canada.

The demo focuses on four smart contract ideas:

1. A borrower controls one persistent blockchain identity across jurisdictions.
2. Only authorized financial institutions can write credit records.
3. Credit records are append-only, so history is not erased when a correction is needed.
4. A borrower can dispute a record, and the source institution can resolve the dispute by appending a correction record that references the original record.

This is not a production credit bureau. It is a small Hardhat prototype designed to show how smart contracts can enforce update permissions and create an auditable correction trail.

## Rubric Alignment

The course rubric gives the code/demo section the highest score when the demo is well developed, works, suits the economic problem, and explains how blockchain or smart contracts apply to the situation.

This repository targets that standard by including:

- `contracts/CrossBorderCreditRegistry.sol`: the smart contract for institutions, borrowers, credit records, disputes, and corrections.
- `scripts/runDemo.js`: a complete walkthrough that prints each transaction step and final borrower history.
- `test/CrossBorderCreditRegistry.js`: automated tests for authorization, cross-border record writing, disputes, corrections, and blocked unauthorized writers.
- `DEMO_SCRIPT.md`: a short speaking guide for a 5-10 minute presentation.
- `WHITEPAPER_ALIGNMENT.md`: a mapping from the white paper claims to concrete contract behavior.

## Part A. Setup

1. Clone this repository and enter the project directory.

```bash
git clone https://github.com/Whywhy9115/cross-border-credit-lab.git
cd cross-border-credit-lab
```

2. Install the Hardhat dependencies.

```bash
npm install
```

3. Compile the smart contract.

```bash
npm run compile
```

E0. Copy the compile output into your notes. What Solidity file was compiled?

E1. Open `contracts/CrossBorderCreditRegistry.sol`. What data is stored directly on-chain, and what data is represented as a hash or URI?

## Part B. Run the Demo

1. Run the complete scripted demo on the local Hardhat network.

```bash
npm run demo
```

The script deploys the registry and uses five demo accounts:

- Regulator: owns the registry and authorizes institutions.
- Maple Bank: a Canadian institution.
- Steel City Credit Union: a United States institution.
- Alice: a borrower moving across borders.
- Attacker: an unauthorized account used to prove access control works.

E2. Copy the deployed contract address printed by the script.

E3. Show the two institution authorization steps. Why should this be controlled by the regulator instead of by borrowers?

E4. Show Alice's identity hash. Why is a hash safer than putting a passport number, SSN, SIN, or full credit file directly on-chain?

E5. Copy the original Canadian credit record. What jurisdiction and institution wrote it?

E6. Copy the disputed flag after Alice opens the dispute. Who is allowed to open this dispute?

E7. Copy the correction record. What is the `previousRecordId`, and why is this better than overwriting the original record?

E8. Copy the United States credit record. How does this demonstrate credit portability?

E9. Copy the unauthorized write failure. What smart contract rule blocks the attacker?

## Part C. Run the Tests

1. Run the automated test suite.

```bash
npm test
```

E10. Copy the test result summary.

E11. Which test proves that unauthorized accounts cannot write fake records?

E12. Which test proves that corrections are appended rather than overwritten?

## Part D. Suggested Video Walkthrough

For the final video, use this order:

1. State the economic problem: credit histories do not port cleanly across the US-Canada border.
2. Explain the blockchain fit: shared audit trail, persistent borrower identity, institution permissions, append-only correction history.
3. Open the contract and point to the structs: `Institution`, `Borrower`, `CreditRecord`, and `Dispute`.
4. Run `npm run demo`.
5. Explain each printed step using the E2-E9 questions above.
6. Run `npm test`.
7. End with limitations: real deployments need privacy-preserving data design, regulator buy-in, off-chain evidence storage, and compliance with financial data laws.

## Key Design Choices

Personal financial details are not stored directly in the contract. The demo uses hashes and `ipfs://`-style metadata references because real credit files contain sensitive information.

Corrections do not delete original records. The smart contract appends a correction record with `previousRecordId`, preserving an auditable timeline.

Only the source institution can resolve a dispute for the record it created. This keeps update authority explicit and visible.

The regulator owner can deactivate institutions. This models the need for permissioned writers in a financial data network.

