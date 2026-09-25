import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=createServer(async(q,r)=>{let f=join(process.cwd(),decodeURI(q.url.split('?')[0]));if(f.endsWith('/'))f=join(f,'index.html');
  try{const d=await readFile(f);r.writeHead(200,{'Content-Type':T[extname(f)]??'text/plain'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const out=process.argv[2];
const b=await chromium.launch();
for(const [w,h] of [[1440,900],[390,844]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/`,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  const geo=await p.evaluate(()=>{const s=document.querySelector('#workflow');
    return {haut:s.offsetTop, h:s.offsetHeight};});
  /* on balaie la section et on capture quand le jalon voulu est affiché */
  const voulus=new Map([['Réception',0],['Traitement',0],['En service',0]]);
  for(let f=0.02; f<=0.99; f+=0.006){
    await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}), geo.haut + geo.h*f);
    await p.waitForTimeout(40);
    const t=await p.evaluate(()=>{
      const m=document.querySelector('#workflow .milestone .title');
      const g=document.querySelector('#workflow .governance');
      return {titre:m?m.textContent.trim():'', vis:g?+getComputedStyle(g).opacity:0,
              lead:document.querySelector('#workflow .governance .lead')?.textContent.trim(),
              detail:document.querySelector('#workflow .governance .detail')?.textContent.trim(),
              pct:document.querySelector('#workflow .readout')?.textContent.trim()};
    });
    if(voulus.has(t.titre) && voulus.get(t.titre)===0 && t.vis>0.85){
      voulus.set(t.titre, 1);
      const nom=t.titre.replace(/[^A-Za-zÀ-ÿ]/g,'');
      await p.screenshot({path:`${out}/jalon-${nom}-${w}.png`});
      console.log(`  ${w}px ${t.titre.padEnd(12)} readout="${t.pct}"  lead="${t.lead}"`);
      console.log(`        detail="${t.detail}"`);
    }
    if([...voulus.values()].every(v=>v)) break;
  }
  for(const [k,v] of voulus) if(!v) console.log(`  ${w}px ${k} : NON CAPTURÉ`);
  await ctx.close();
}
await b.close(); srv.close();
