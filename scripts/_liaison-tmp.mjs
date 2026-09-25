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
const CIBLES=['.benefit-tl','.benefit-tr','.benefit-bl','.benefit-br'];
for(const [w,h] of [[1440,900],[390,844]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/`,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  const geo=await p.evaluate(()=>{const s=document.querySelector('#liaison');return {haut:s.offsetTop,h:s.offsetHeight};});
  /* on cherche le moment où les 4 blocs sont le plus visibles */
  let best=null;
  for(let f=0.05; f<=0.95; f+=0.02){
    await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}), geo.haut+geo.h*f);
    await p.waitForTimeout(45);
    const s=await p.evaluate(sels=>sels.reduce((a,x)=>{const e=document.querySelector(x);
      return a + (e?+getComputedStyle(e).opacity:0);},0), CIBLES);
    if(!best||s>best.s) best={s,f};
  }
  await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}), geo.haut+geo.h*best.f);
  await p.waitForTimeout(700);
  await p.screenshot({path:`${out}/liaison-${w}.png`});
  const d=await p.evaluate(sels=>{
    const R=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height};};
    const titre=R(document.querySelector('#liaison-title'));
    const scene=R(document.querySelector('#liaison .scene')||document.querySelector('#liaison .scene-svg'));
    const ch=(a,c)=>{const ox=Math.min(a.r,c.r)-Math.max(a.x,c.x),oy=Math.min(a.b,c.b)-Math.max(a.y,c.y);
      return (ox>0&&oy>0)?`${ox.toFixed(1)}x${oy.toFixed(1)}px`:'0';};
    const out=[];
    for(const s of sels){const e=document.querySelector(s); if(!e){out.push([s,'absent']);continue;}
      const r=R(e); out.push([s, `boîte ${Math.round(r.x)}..${Math.round(r.r)} x ${Math.round(r.y)}..${Math.round(r.b)}`,
        `titre:${ch(r,titre)}`, `opacité ${(+getComputedStyle(e).opacity).toFixed(2)}`]);}
    // entre eux
    const paires=[];
    for(let i=0;i<sels.length;i++) for(let j=i+1;j<sels.length;j++){
      const a=document.querySelector(sels[i]), c=document.querySelector(sels[j]);
      if(a&&c) paires.push(`${sels[i]}↔${sels[j]}:${ch(R(a),R(c))}`);
    }
    return {out, paires, titre:`${Math.round(titre.x)}..${Math.round(titre.r)} x ${Math.round(titre.y)}..${Math.round(titre.b)}`};
  }, CIBLES);
  console.log(`\n--- ${w}x${h} (scroll ${(best.f*100).toFixed(0)}% de la section) ---  titre ${d.titre}`);
  for(const l of d.out) console.log('  '+l.join('  |  '));
  console.log('  entre blocs : '+d.paires.join('  '));
  await ctx.close();
}
await b.close(); srv.close();
