const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossBorderCreditRegistry", function () {
  async function deployFixture() {
    const [owner, canadaBank, usBank, alice, attacker] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CrossBorderCreditRegistry");
    const registry = await Registry.connect(owner).deploy();
    await registry.waitForDeployment();

    await registry.authorizeInstitution(canadaBank.address, "Maple Bank", "Canada");
    await registry.authorizeInstitution(usBank.address, "Steel City Credit Union", "United States");
    await registry.connect(alice).registerBorrower(ethers.id("did:portable-credit:alice"), "Canada");

    return { registry, owner, canadaBank, usBank, alice, attacker };
  }

  it("lets only the regulator authorize institutions", async function () {
    const { registry, canadaBank, attacker } = await deployFixture();

    await expect(
      registry.connect(attacker).authorizeInstitution(attacker.address, "Fake Bureau", "Nowhere")
    ).to.be.revertedWith("only regulator owner");

    const institution = await registry.institutions(canadaBank.address);
    expect(institution.active).to.equal(true);
    expect(institution.name).to.equal("Maple Bank");
  });

  it("records cross-border credit events for the same borrower identity", async function () {
    const { registry, canadaBank, usBank, alice } = await deployFixture();

    await expect(
      registry.connect(canadaBank).submitCreditRecord(alice.address, "loan_repayment", 45, "ipfs://loan-q1")
    ).to.emit(registry, "CreditRecordSubmitted");

    await expect(
      registry.connect(usBank).submitCreditRecord(alice.address, "card_payment", 15, "ipfs://card-april")
    ).to.emit(registry, "CreditRecordSubmitted");

    const ids = await registry.getBorrowerRecordIds(alice.address);
    expect(ids.map((id) => id.toString())).to.deep.equal(["1", "2"]);

    const canadianRecord = await registry.getCreditRecord(1);
    const usRecord = await registry.getCreditRecord(2);
    expect(canadianRecord.jurisdiction).to.equal("Canada");
    expect(usRecord.jurisdiction).to.equal("United States");
  });

  it("blocks unauthorized writers", async function () {
    const { registry, attacker, alice } = await deployFixture();

    await expect(
      registry.connect(attacker).submitCreditRecord(alice.address, "fake_record", -100, "ipfs://fake")
    ).to.be.revertedWith("only authorized institution");
  });

  it("opens disputes and appends corrections instead of overwriting records", async function () {
    const { registry, canadaBank, alice } = await deployFixture();

    await registry
      .connect(canadaBank)
      .submitCreditRecord(alice.address, "loan_repayment", 45, "ipfs://loan-q1");

    await expect(registry.connect(alice).openDispute(1, "ipfs://alice-dispute"))
      .to.emit(registry, "DisputeOpened")
      .withArgs(1, alice.address, "ipfs://alice-dispute");

    await expect(
      registry
        .connect(canadaBank)
        .resolveDispute(
          1,
          true,
          "ipfs://bank-evidence",
          "loan_repayment_corrected",
          60,
          "ipfs://loan-q1-corrected"
        )
    ).to.emit(registry, "DisputeResolved");

    const originalRecord = await registry.getCreditRecord(1);
    const correctionRecord = await registry.getCreditRecord(2);
    const dispute = await registry.getDispute(1);

    expect(originalRecord.disputed).to.equal(true);
    expect(correctionRecord.previousRecordId).to.equal(1);
    expect(correctionRecord.scoreDelta).to.equal(60);
    expect(dispute.correctionRecordId).to.equal(2);
  });

  it("allows only the source institution to resolve its disputed record", async function () {
    const { registry, canadaBank, usBank, alice } = await deployFixture();

    await registry
      .connect(canadaBank)
      .submitCreditRecord(alice.address, "loan_repayment", 45, "ipfs://loan-q1");
    await registry.connect(alice).openDispute(1, "ipfs://alice-dispute");

    await expect(
      registry
        .connect(usBank)
        .resolveDispute(1, true, "ipfs://us-evidence", "wrong_source", 1, "ipfs://wrong")
    ).to.be.revertedWith("only source institution");
  });

  async function openCanadianDispute() {
    const fixture = await deployFixture();
    const { registry, canadaBank, alice } = fixture;
    await registry.connect(canadaBank).submitCreditRecord(alice.address, "repayment", 45, "ipfs://original");
    await registry.connect(alice).openDispute(1, "ipfs://borrower-evidence");
    return fixture;
  }

  const Open = 1n, ResolvedAccepted = 2n, ResolvedRejected = 3n;

  it("preserves a rejected record and closes it to further disputes", async function () {
    const { registry, canadaBank, alice } = await openCanadianDispute();
    const original = await registry.getCreditRecord(1);
    await registry.connect(canadaBank).resolveDispute(1, false, "ipfs://issuer-evidence", "", 0, "");

    await expect(registry.connect(alice).openDispute(1, "ipfs://new-evidence"))
      .to.be.revertedWith("record already disputed");
    const dispute = await registry.getDispute(1);
    expect(dispute.status).to.equal(ResolvedRejected);
    expect(dispute.correctionRecordId).to.equal(0n);
    expect(dispute.institutionEvidenceHash).to.equal("ipfs://issuer-evidence");
    expect(await registry.getCreditRecord(1)).to.deep.equal(original);
    expect(await registry.getBorrowerRecordIds(alice.address)).to.deep.equal([1n]);
    expect(await registry.recordCount()).to.equal(1n);
  });

  it("opens an independent dispute on an appended correction", async function () {
    const { registry, canadaBank, alice } = await openCanadianDispute();
    await registry.connect(canadaBank).resolveDispute(1, true, "ipfs://review", "repayment", 60, "ipfs://fixed");
    const originalDispute = await registry.getDispute(1);
    expect(originalDispute.status).to.equal(ResolvedAccepted);
    expect(originalDispute.correctionRecordId).to.equal(2n);

    await registry.connect(alice).openDispute(2, "ipfs://correction-evidence");
    const correctionDispute = await registry.getDispute(2);
    expect(correctionDispute.status).to.equal(Open);
    expect(correctionDispute.reasonHash).to.equal("ipfs://correction-evidence");
    expect((await registry.getCreditRecord(2)).previousRecordId).to.equal(1n);
    expect(await registry.getDispute(1)).to.deep.equal(originalDispute);
  });

  it("keeps a dispute open during issuer deactivation and lets the reauthorized issuer resolve it", async function () {
    const { registry, canadaBank, usBank } = await openCanadianDispute();
    const pending = await registry.getDispute(1);
    expect(pending.status).to.equal(Open);
    await registry.deactivateInstitution(canadaBank.address);
    const resolve = (issuer) => registry.connect(issuer).resolveDispute(1, false, "ipfs://review", "", 0, "");
    await expect(resolve(canadaBank)).to.be.revertedWith("only authorized institution");
    await expect(resolve(usBank)).to.be.revertedWith("only source institution");
    expect(await registry.getDispute(1)).to.deep.equal(pending);

    await registry.authorizeInstitution(canadaBank.address, "Maple Bank", "Canada");
    await resolve(canadaBank);
    expect((await registry.getDispute(1)).status).to.equal(ResolvedRejected);
  });
});
