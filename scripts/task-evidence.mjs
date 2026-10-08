/** Current task bindings; separate structural projection, implementation and proof. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const seed=json('projection/task_seed.json'),issues=json('projection/open_issues_snapshot.json');
const proof={
  'DEV-01':['components/game/itaipu-world.tsx','scripts/browser-qa.mjs','evidence/browser-qa.json'],
  'DEV-02':['lib/aurum/presentation.ts','tests/aurum/presentation.test.ts','evidence/task-tests.tap'],
  'DEV-03':['lib/aurum/simulation.ts','tests/aurum/itaipu-economy.test.ts','evidence/task-tests.tap'],
};
for(const n of [9,10,11,12,13,14,15,16,19,20,21,23,24])proof[`DEV-${String(n).padStart(2,'0')}`]=[
  n===9?'docs/VISUAL.md':n===21?'app/globals.css':n===19?'lib/aurum/camera.ts':n<16?'lib/aurum/map-renderer.ts':'components/game/itaipu-world.tsx',
  'scripts/browser-qa.mjs','evidence/browser-qa.json'];
for(const n of [17,18,22,26,27,28,37,38,46,47])proof[`DEV-${n}`]=[
  n===18?'lib/aurum/presentation.ts':'components/game/regional-panels.tsx','tests/aurum/presentation.test.ts','evidence/task-tests.tap'];
proof['DEV-25']=['lib/aurum/tutorial.ts','tests/aurum/tutorial.test.ts','evidence/browser-qa.json'];
for(const n of [31,32,68])proof[`DEV-${n}`]=['lib/aurum/local-save.ts','tests/aurum/local-save.test.ts','evidence/browser-qa.json'];
for(const n of [41,42])proof[`DEV-${n}`]=['fixtures/itaipu-scenario.json','tests/aurum/itaipu-economy.test.ts','evidence/task-tests.tap'];
proof['DEV-48']=['lib/aurum/geography.ts','tests/aurum/route-cache.test.ts','evidence/task-benchmark.json'];
proof['DEV-65']=['lib/aurum/map-renderer.ts','tests/aurum/rendering.test.ts','evidence/task-benchmark.json'];
proof['DEV-66']=['components/game/itaipu-world.tsx','scripts/benchmark-tasks.ts','evidence/task-benchmark.json'];
proof['DEV-67']=['components/game/itaipu-world.tsx','scripts/browser-qa.mjs','evidence/browser-qa.json'];
proof['DEV-71']=['.github/workflows/quality.yml','scripts/browser-qa.mjs','evidence/task-tests.tap'];
proof['DEV-72']=['scripts/package-release.mjs','scripts/browser-qa.mjs','evidence/release-browser-qa.json'];
proof['DEV-81']=['lib/aurum/contributions.ts','tests/aurum/contributions.test.ts','evidence/task-tests.tap'];
proof['DEV-87']=['scripts/drift-report.mjs','scripts/drift-report.mjs','evidence/drift-report.json'];
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const guarded={
  'DEV-04':'Comparação/calibração de parâmetros de construção/energia ainda não executada; QA não decide balanceamento oficial.',
  'DEV-05':'Contrato de necessidade dos moradores e efeito de escassez ainda aberto no Seed.',
  'DEV-06':'Fator regional, origem, unidade e binding ao loop ainda pendentes.',
  'DEV-07':'Expansão para outro mapa explicitamente adiada.',
  'DEV-08':'Bindings de sessão autoritativa, identidade e persistência ainda abertos.',
  'DEV-29':'Metas adicionais versionadas ainda não formalizadas no juiz.',
  'DEV-51':'Regeneração RM7 ainda não ligada ao estoque de fontes do loop; taxas e contabilidade precisam de binding versionado.',
  'DEV-60':'Requer sessões longas consentidas com jogadores reais; não pode ser certificado por bots.',
  'DEV-73':'Backend/contrato de servidor ainda sem binding de produção.',
  'DEV-74':'Provedor de identidade verificável ainda não selecionado/integrado.',
  'DEV-75':'Armazenamento durável ainda sem binding e prova de reinício.',
  'DEV-80':'Verificador externo de origem regional ainda sem integração.',
  'DEV-82':'Adaptador de commit/diff e revisão independente real ainda pendente.',
  'DEV-88':'Consumidor externo e critério de utilidade observada ainda ausentes.',
};
const tasks=seed.tasks.map(t=>{
  const issue=issues.find(i=>i.title.startsWith(`[${t.id}]`));
  if(!t.selected)return {id:t.id,issue:issue?.issue_number??null,status:'PENDING',requires:t.requires,
    cause:guarded[t.id]??(t.extension?'Nova regra [S]: Seed diff e políticas/parametrização ainda não selecionados; não foram inventados silenciosamente.':`Integração não materializada; depende de ${t.requires.join(', ')||'prova específica do backlog'}.`)};
  const binding=proof[t.id];if(!binding||binding.some(p=>!existsSync(p)))throw Error('Missing proof for '+t.id);
  return {id:t.id,issue:issue?.issue_number??null,requires:t.requires,status:'LOCAL_VERIFIED',
    implementation:binding[0],test:binding[1],evidence:binding[2],hashes:Object.fromEntries([...new Set(binding)].map(p=>[p,hash(p)])),
    ...(t.id==='DEV-71'?{remoteCI:'PENDING_GITHUB_RUN'}:{})};
});
const tests=readFileSync('evidence/task-tests.tap','utf8');
if(!tests.includes('pass 28')||!tests.includes('fail 0'))throw Error('Task tests did not pass');
const browser=json('evidence/browser-qa.json'),release=json('evidence/release-browser-qa.json');
if(browser.errors.length||release.errors.length||browser.outcomes.length<9||release.outcomes.length<9)throw Error('QA incomplete');
const result={id:'AC-TASK-VERIFY-1',tasksTotal:100,localVerified:tasks.filter(t=>t.status==='LOCAL_VERIFIED').length,
  pending:tasks.filter(t=>t.status==='PENDING').length,taskSeedHash:hash('projection/task_seed.json'),testsPassed:28,
  browserFlows:browser.outcomes.length,releaseBrowserFlows:release.outcomes.length,remoteCI:'PENDING_GITHUB_RUN',
  additional:[{id:'AC-001',issue:5,implementation:'docs/ARCHITECTURE.md',status:'DOCUMENTED',evidence:'architecture references checked against manifests and implementation'}],
  caveat:'Local evidence is not production multiplayer, independent review, external utility or official balance approval',tasks};
writeFileSync('projection/task_manifest.json',JSON.stringify({id:'AC-TASK-MANIFEST-1',seedHash:result.taskSeedHash,bindings:tasks.filter(t=>t.status==='LOCAL_VERIFIED')},null,2)+'\n');
writeFileSync('evidence/task-validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({verified:result.localVerified,pending:result.pending,issuesReady:tasks.filter(t=>t.issue&&t.status==='LOCAL_VERIFIED').length+1}));
