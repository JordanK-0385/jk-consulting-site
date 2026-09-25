import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=createServer(async(q,r)=>{let f=join(process.cwd(),decodeURI(q.url.split('?')[0]));if(f.endsWith('/'))f=join(f,'index.html');
  try{const d=await readFile(f);r.writeHead(200,{'Content-Type':T[extname(f)]??'text/plain'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await chromium.launch();
for(const [w,h] of [[1440,900],[390,844]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/`,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await p.waitForTimeout(900);
  const d=await p.evaluate(()=>{
    const t=document.querySelector('#contact-title'), st=getComputedStyle(t), r=t.getBoundingClientRect();
    const lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize)*1.1;
    const k=document.querySelector('#contact .kicker').getBoundingClientRect();
    const c=document.querySelector('#contact .cta-row').getBoundingClientRect();
    const l=document.querySelector('#contact .lede').getBoundingClientRect();
    return {fs:st.fontSize, lignes:Math.round(r.height/lh), h:+r.height.toFixed(1), w:+r.width.toFixed(1),
      kickerHaut:+k.top.toFixed(1), ctaBas:+c.bottom.toFixed(1), vh:innerHeight,
      titreLede:+(l.top-r.bottom).toFixed(1), ledeCta:+(c.top-l.bottom).toFixed(1)};
  });
  console.log(`  ${String(w).padStart(4)}x${h}: ${d.lignes} lignes, ${d.w}x${d.h}px, font ${d.fs}  | kicker haut ${d.kickerHaut}, CTA bas ${d.ctaBas}, viewport ${d.vh}  | écarts titre→chapô ${d.titreLede}px, chapô→CTA ${d.ledeCta}px`);
  await ctx.close();
}
await b.close(); srv.close();
