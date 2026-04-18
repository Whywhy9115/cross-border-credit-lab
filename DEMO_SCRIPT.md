# 5-10 Minute Video Script

## 1. Problem

Our white paper focuses on a cross-border credit problem. When someone moves between Canada and the United States, their credit history may not transfer cleanly. This can make a responsible borrower look credit invisible in the new country.

The code demo shows a small blockchain registry for portable credit records.

## 2. Why Blockchain

Blockchain is useful here because the system needs a shared audit trail across institutions. We want to know who wrote each credit record, whether the writer was authorized, whether a borrower disputed the record, and whether a correction was appended later.

The important blockchain idea is not that all private credit data should be public. The contract stores hashes and metadata references, while the sensitive documents would stay off-chain.

## 3. Contract Walkthrough

Open `contracts/CrossBorderCreditRegistry.sol`.

Point out:

- `Institution`: stores whether a bank or credit bureau can write records.
- `Borrower`: stores a portable identity hash and home jurisdiction.
- `CreditRecord`: stores the institution, borrower, jurisdiction, record type, score effect, metadata hash, and previous record reference.
- `Dispute`: stores the disputed record, borrower reason hash, institution evidence hash, final status, and correction record.

Then explain the access rules:

- `onlyOwner`: only the regulator can authorize institutions.
- `onlyActiveInstitution`: only approved institutions can submit records.
- A borrower can only dispute their own record.
- Only the original source institution can resolve the dispute.

## 4. Run The Demo

Run:

```bash
npm run demo
```

Narrate the output:

1. The registry is deployed.
2. The regulator authorizes Maple Bank in Canada and Steel City Credit Union in the United States.
3. Alice registers a portable blockchain identity.
4. Maple Bank writes a Canadian credit record for Alice.
5. Alice disputes that record.
6. Maple Bank resolves the dispute by appending a correction record.
7. Steel City Credit Union writes a US record for the same Alice identity.
8. The attacker account tries to write a fake record and gets blocked.

The most important line is the final borrower history. It includes the original Canadian record, the correction record, and the US record. That is the portability and audit trail.

## 5. Run Tests

Run:

```bash
npm test
```

Explain that the tests prove the core demo claims:

- Regulator-only institution authorization.
- Cross-border record creation.
- Unauthorized writers are blocked.
- Disputes create append-only corrections.
- A non-source institution cannot resolve another institution's disputed record.

## 6. Limitations

This is a prototype. A real system would need privacy-preserving identity, encrypted off-chain evidence, institutional governance, and compliance with credit reporting laws in each country.

The demo still captures the key smart contract idea from the white paper: a shared, permissioned, append-only record system for portable credit histories and disputed record corrections.

