/** DEV-72: deterministic standalone package; no hosting or publication. */
import {cp,mkdir,rm,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const directory='.release/app',archive='.release/aurum-itaipu.tgz';
await rm(directory,{recursive:true,force:true});await mkdir(directory,{recursive:true});
await cp('.next/standalone',directory,{recursive:true});
await cp('.next/static',directory+'/.next/static',{recursive:true});
if(existsSync('public'))await cp('public',directory+'/public',{recursive:true});
const fixture=JSON.parse(await readFile('fixtures/itaipu-scenario.json','utf8'));
const metadata={format:'AC-RELEASE-1',rulesVersion:fixture.rules.version,mapVersion:fixture.rules.geography.version,
  rulesHash:hash(Buffer.from(JSON.stringify(fixture.rules))),mapHash:fixture.rules.geography.mapHash,
  sourceHash:fixture.rules.geography.sourceHash,nodeMajor:24,
  start:'HOSTNAME=127.0.0.1 PORT=3000 node server.js',route:'/itaipu',
  limits:['Local experimental game; no production multiplayer','Save compatibility requires exact map and rules','OSM attribution and virtual resource assumptions preserved'],
  rollback:'Keep previous archive; stop the new process and restart the previous package. Export saves before changing rule versions.'};
await writeFile(directory+'/RELEASE.json',JSON.stringify(metadata,null,2)+'\n');
execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',directory,'.']);
const bytes=await readFile(archive);
await writeFile('evidence/release-package.json',JSON.stringify({...metadata,archive,bytes:bytes.length,sha256:hash(bytes)},null,2)+'\n');
console.log(JSON.stringify({archive,bytes:bytes.length,sha256:hash(bytes)}));
