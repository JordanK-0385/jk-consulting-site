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
  for(let i=0;i<40;i++){
    const t=await p.evaluate(()=>{const e=document.querySelector('#faq .grid');const y=e.getBoundingClientRect().top;
      scrollTo({top:scrollY+y-50,behavior:'instant'});return y;});
    await p.waitForTimeout(110); if(Math.abs(t-50)<2) break;
  }
  await p.waitForTimeout(700);
  const ouverts=()=>p.evaluate(()=>[...document.querySelectorAll('#faq .faq-item')]
    .map((d,i)=>d.open?i+1:0).filter(Boolean));
  console.log(`  ${w}px  au chargement, ouvert(s) : [${await ouverts()}]`);
  await p.screenshot({path:`${out}/faq-${w}.png`});
  /* exclusivité : on ouvre le 04 */
  await p.evaluate(()=>document.querySelectorAll('#faq summary')[3].click());
  await p.waitForTimeout(500);
  console.log(`  ${w}px  après clic sur le 04, ouvert(s) : [${await ouverts()}]`);
  await p.screenshot({path:`${out}/faq-04-${w}.png`});
  await ctx.close();
}
await b.close(); srv.close();
