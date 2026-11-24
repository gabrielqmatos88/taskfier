import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

let child, base, dataDir, logs='';
async function freePort(){const s=createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}
before(async()=>{
  dataDir=await mkdtemp(join(tmpdir(),'kanban-production-'));const port=await freePort();base=`http://127.0.0.1:${port}`;
  child=spawn(process.execPath,['src/server.js'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),KANBAN_DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
  for(let i=0;i<80;i++){if(child.exitCode!==null)throw new Error(`Server exited: ${logs}`);try{if((await fetch(`${base}/api/health`)).ok)return;}catch{}await delay(100);}
  throw new Error(`Server did not start: ${logs}`);
});
after(async()=>{if(child&&!child.killed){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),delay(3000)]);}if(dataDir)await rm(dataDir,{recursive:true,force:true});});

test('Express serves the Vite build and keeps API misses out of the SPA document',async()=>{
  const root=await fetch(`${base}/`);assert.equal(root.status,200);const html=await root.text();assert.match(html,/<div id="root"|<div id="app"/i);
  const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match=>match[1]);assert.ok(assets.length>0,'built entry assets are referenced');
  for(const asset of assets){const response=await fetch(new URL(asset,base));assert.equal(response.status,200,`${asset} should load`);}
  const health=await fetch(`${base}/api/health`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true});
  const missing=await fetch(`${base}/api/no-such-route`);assert.equal(missing.status,404);assert.doesNotMatch(await missing.text(),/<div id="root"/i);
});
