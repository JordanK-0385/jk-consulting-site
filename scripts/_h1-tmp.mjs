import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=createServer(async(q,r)=>{let f=join(process.cwd(),decodeURI(q.url.split('?')[0]));if(f.endsWith('/'))f=join(f,'index.html');
  try{const d=await readFile(f);r.writeHead(200,{'Content-Type':T[extname(f)]??'text/plain'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const b=await chromium.launch();
for(const [w,h] of [[1920,1080],[1600,900],[1440,900],[1280,800],[1024,768],[820,1180],[390,844],[360,740]]){
  const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/`,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
  const d=await p.evaluate(()=>{
    const t=document.querySelector('#contact-title'), st=getComputedStyle(t);
    const r=t.getBoundingClientRect();
    const lh=parseFloat(st.lineHeight)||parseFloat(st.fontSize)*1.1;
    const hero=document.querySelector('#contact .inner').getBoundingClientRect();
    const cue=document.querySelector('#contact .cta-row').getBoundingClientRect();
    return {fs:st.fontSize, lh:+lh.toFixed(1), lignes:Math.round(r.height/lh),
      w:+r.width.toFixed(1), h:+r.height.toFixed(1),
      partEcran:+(r.width/innerWidth*100).toFixed(0),
      heroBas:+hero.bottom.toFixed(1), cueBas:+cue.bottom.toFixed(1), vh:innerHeight};
  });
  console.log(`${String(w).padStart(4)}x${h}: ${d.lignes} lignes  h1 ${d.w}x${d.h}px (${d.partEcran}% de large)  font ${d.fs} lh ${d.lh}  | hero bas ${d.heroBas} / cue bas ${d.cueBas} / viewport ${d.vh}`);
  await ctx.close();
}
await b.close(); srv.close();
