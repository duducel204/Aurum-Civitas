/** DEV-87: additive current view, never rewrite historical Seed/manifests. */
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifests=['projection/repository_manifest.json','projection/itaipu_manifest.json'];
const bindings=manifests.flatMap(path=>JSON.parse(readFileSync(path,'utf8')).bindings.map(b=>({...b,manifest:path})));
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const report=bindings.map(b=>({id:b.module_id,manifest:b.manifest,planned:true,
  implementation:b.implementation,implemented:existsSync(b.implementation),
  implementationHash:existsSync(b.implementation)?hash(b.implementation):null,
  test:b.test_path,testPresent:existsSync(b.test_path),
  mission:b.mission_path,missionPresent:existsSync(b.mission_path),
  historicalEvidence:b.evidence_path,evidencePresent:existsSync(b.evidence_path),
  executionStatus:'See task-validation.json and tests.tap for this commit; file existence alone is not a passing test',
  integrated:['RM0','RM1','RM2','RM3','RM4','RM5','RMD','RME','RMF'].includes(b.module_id),
  integrationScope:['RM0','RM1','RM2','RM3','RM4','RM5','RMD','RME','RMF'].includes(b.module_id)?'local web client':'isolated logic/adapters; collective UI or external provider pending'}));
const out={id:'AC-DRIFT-1',historicalManifestHashes:Object.fromEntries(manifests.map(p=>[p,hash(p)])),bindings:report,
  contradictions: ['Historical PROJECTED_NOT_CREATED and current implementation refer to different moments; preserved as history'],
  missing:report.filter(b=>!b.implemented||!b.testPresent||!b.missionPresent).map(b=>b.id)};
writeFileSync('evidence/drift-report.json',JSON.stringify(out,null,2)+'\n');
if(out.missing.length)throw Error('Missing trace bindings: '+out.missing.join(','));
console.log(JSON.stringify({bindings:report.length,missing:out.missing,isolated:report.filter(b=>!b.integrated).map(b=>b.id)}));
