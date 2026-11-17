const { ethers, artifacts } = require('hardhat');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lines=[],checks=[];
const out=s=>{lines.push(s);console.log(s)};
const val=v=>typeof v==='bigint'?v.toString():v;
let registry,alice,transactions=0,reverts=0,correction;
async function record(label,tx){
 const r=await tx.wait();transactions++;assert.equal(r.status,1);
 out(`\n[TX ${String(transactions).padStart(2,'0')}] ${label}`);
 out(`  hash=${r.hash}\n  block=${r.blockNumber} status=${r.status} gasUsed=${r.gasUsed}\n  from=${r.from}\n  to=${r.to||r.contractAddress}`);
 for(const log of r.logs){const ev=registry.interface.parseLog(log);if(ev)out('  event '+ev.name+'('+ev.fragment.inputs.map((x,i)=>x.name+'='+val(ev.args[i])).join(', ')+')')}
 return r;
}
async function rejected(label,call,reason){
 let err;try{await call()}catch(e){err=e}assert(err,`${label} must reject`);assert(err.message.includes(reason));reverts++;
 const s=`[PASS] eth_call ${label} -> REVERT "${reason}"`;out('\n'+s);checks.push(s);
}
async function state(label){
 const ids=await registry.getBorrowerRecordIds(alice.address);out(`\n[STATE] ${label}; recordCount=${await registry.recordCount()}; history=[${ids.join(',')}]`);
 for(const id of ids){const r=await registry.getCreditRecord(id);out('  '+JSON.stringify({id:r.id,jurisdiction:r.jurisdiction,type:r.recordType,scoreDelta:r.scoreDelta,previousRecordId:r.previousRecordId,disputed:r.disputed,createdAt:r.createdAt},(_,v)=>val(v)))}
 return ids;
}
async function main(){
 const [owner,ca,us,borrower,outsider]=await ethers.getSigners();alice=borrower;const net=await ethers.provider.getNetwork();
 out('$ npx hardhat run scripts/captureTrace.js');out(`CrossBorderCreditRegistry / recorded local execution / chainId=${net.chainId}`);
 out('Synthetic accounts and records. Rejection checks use eth_call; rejected transactions are not mined.');
 out('Contract bytecode keccak256='+ethers.keccak256((await artifacts.readArtifact('CrossBorderCreditRegistry')).bytecode));
 registry=await(await ethers.getContractFactory('CrossBorderCreditRegistry')).connect(owner).deploy();await registry.waitForDeployment();
 await record('DEPLOY CrossBorderCreditRegistry',registry.deploymentTransaction());
 await rejected('outsider.authorizeInstitution',()=>registry.connect(outsider).authorizeInstitution.staticCall(outsider.address,'Fake','Nowhere'),'only regulator owner');
 await record('REGULATOR authorizeInstitution(Canada)',await registry.authorizeInstitution(ca.address,'Maple Bank','Canada'));
 await record('REGULATOR authorizeInstitution(US)',await registry.authorizeInstitution(us.address,'Steel City Credit Union','United States'));
 await rejected('institution.submitCreditRecord(unregistered borrower)',()=>registry.connect(ca).submitCreditRecord.staticCall(alice.address,'loan',45,'ipfs://loan'),'borrower not registered');
 await record('BORROWER registerBorrower',await registry.connect(alice).registerBorrower(ethers.id('did:portable-credit:alice:demo'),'Canada'));
 await record('CANADA submitCreditRecord(original)',await registry.connect(ca).submitCreditRecord(alice.address,'loan_repayment',45,'ipfs://loan-repayment-q1'));await state('original record');
 await rejected('outsider.submitCreditRecord',()=>registry.connect(outsider).submitCreditRecord.staticCall(alice.address,'fake',-100,'ipfs://fake'),'only authorized institution');
 await rejected('outsider.openDispute',()=>registry.connect(outsider).openDispute.staticCall(1,'ipfs://fake'),'only borrower can dispute');
 await record('BORROWER openDispute(record=1)',await registry.connect(alice).openDispute(1,'ipfs://alice-dispute-wrong-delta'));await state('dispute opened');
 await rejected('US.resolveDispute(Canadian record)',()=>registry.connect(us).resolveDispute.staticCall(1,true,'ipfs://evidence','corrected',60,'ipfs://corrected'),'only source institution');
 const correctionStart=lines.length;
 correction=await record('CANADA resolveDispute -> append correction',await registry.connect(ca).resolveDispute(1,true,'ipfs://maple-bank-investigation','loan_repayment_corrected',60,'ipfs://loan-repayment-q1-corrected'));
 const correctionLines=lines.slice(correctionStart);await state('correction appended');
 const original=await registry.getCreditRecord(1),fixed=await registry.getCreditRecord(2),dispute=await registry.getDispute(1);
 assert.equal(original.scoreDelta,45n);assert.equal(fixed.scoreDelta,60n);assert.equal(fixed.previousRecordId,1n);assert.equal(dispute.status,2n);assert.equal(dispute.correctionRecordId,2n);
 const preserved='[PASS] original.scoreDelta=45 preserved; correction.scoreDelta=60; previousRecordId=1; dispute.status=ResolvedAccepted';out('\n'+preserved);checks.push(preserved);
 await rejected('source.resolveDispute(already resolved)',()=>registry.connect(ca).resolveDispute.staticCall(1,true,'ipfs://evidence','corrected',60,'ipfs://corrected'),'dispute not open');
 await record('US submitCreditRecord(same borrower)',await registry.connect(us).submitCreditRecord(alice.address,'credit_card_on_time_payment',15,'ipfs://us-card-payment-april'));const ids=await state('cross-border history');assert.deepEqual(ids.map(String),['1','2','3']);
 await record('REGULATOR deactivateInstitution(Canada)',await registry.deactivateInstitution(ca.address));
 await rejected('deactivated institution.submitCreditRecord',()=>registry.connect(ca).submitCreditRecord.staticCall(alice.address,'loan',1,'ipfs://inactive'),'only authorized institution');
 assert.deepEqual((await registry.getBorrowerRecordIds(alice.address)).map(String),['1','2','3']);
 const final=`[PASS] history=[1,2,3] retained after deactivation; ${transactions} successful receipts; ${reverts} expected reverts verified`;out('\n'+final);
 const preview=[lines[0],lines[1],...correctionLines,'',...checks,final].join('\n');
 const output=path.join(__dirname,'../..');
 fs.writeFileSync(output+'/blockchain-trace.txt',lines.join('\n')+'\n');fs.writeFileSync(output+'/blockchain-trace-preview.txt',preview+'\n');
 fs.writeFileSync(output+'/blockchain-trace-metadata.json',JSON.stringify({chainId:String(net.chainId),transactions,expectedReverts:reverts,contract:await registry.getAddress(),recordIds:ids.map(String),originalRecordPreserved:true,correctionLinksOriginal:true,historyRetainedAfterDeactivation:true},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
