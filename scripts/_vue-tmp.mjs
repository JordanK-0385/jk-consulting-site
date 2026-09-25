/* Outil de travail temporaire : capture + mesure de chevauchements.
   Usage : node scripts/_vue-tmp.mjs <dossier> <vue1> [vue2...]        */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
const srv=createServer(async(q,r)=>{let f=join(process.cwd(),decodeURI(q.url.split('?')[0]));if(f.endsWith('/'))f=join(f,'index.html');
  try{const d=await readFile(f);r.writeHead(200,{'Content-Type':T[extname(f)]??'text/plain'});r.end(d);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(0,r));
const PORT=srv.address().port;

/* vue : nom -> { ancre CSS à amener en haut, marge, sélecteurs à confronter } */
const VUES = {
  landing:  { ancre:'#landing .hero', marge:0,  scroll:0,
              paires:[['#landing-title','#landing .scene'],['#landing-title','#landing .cta-row'],
                      ['#landing .lede','#landing .cta-row'],['#landing .cta-row','#landing .cue']] },
  methode:  { ancre:'#methode .intro', marge:80, paires:[['#methode-title','#methode .lede']] },
  outro:    { ancre:'#methode .outro', marge:120, paires:[['#methode .outro h3','#methode .outro .outro-sub'],['#methode .outro .outro-sub','#methode .outro .arrow']] },
  workflow: { ancre:'#workflow .stage', marge:0, paires:[] },
  liaison:  { ancre:'#liaison .stage', marge:0,
              paires:[['#liaison .pola','#liaison .scene']] },
  temoins:  { ancre:'.s-temoignages .head', marge:60, paires:[] },
  faq:      { ancre:'#faq .grid', marge:60, paires:[] },
  contact:  { ancre:'#contact .inner', marge:60, paires:[] },
};
const rect = 'el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom};}';

const out=process.argv[2]; const demandees=process.argv.slice(3);
const b=await chromium.launch();
for(const [w,h] of [[1440,900],[390,844]]){
  for(const nom of demandees){
    const v=VUES[nom]; if(!v) { console.log(`  ?? vue inconnue : ${nom}`); continue; }
    const ctx=await b.newContext({viewport:{width:w,height:h}}); const p=await ctx.newPage();
    await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'networkidle'});
    await p.evaluate(()=>document.fonts.ready);
    if(v.scroll===0){ await p.evaluate(()=>scrollTo({top:0,behavior:'instant'})); }
    else for(let i=0;i<40;i++){
      const t=await p.evaluate(([sel,m])=>{const e=document.querySelector(sel);if(!e)return m;
        const y=e.getBoundingClientRect().top;scrollTo({top:scrollY+y-m,behavior:'instant'});return y;},[v.ancre,v.marge]);
      await p.waitForTimeout(110); if(Math.abs(t-v.marge)<2) break;
    }
    await p.waitForTimeout(800);
    await p.screenshot({path:`${out}/${nom}-${w}.png`});
    for(const [a,c] of v.paires){
      const d=await p.evaluate(([sa,sc,fn])=>{
        const f=eval(fn); const A=document.querySelector(sa), C=document.querySelector(sc);
        if(!A||!C) return null; const ra=f(A), rc=f(C);
        const ox=Math.min(ra.r,rc.r)-Math.max(ra.x,rc.x), oy=Math.min(ra.b,rc.b)-Math.max(ra.y,rc.y);
        return {ra,rc,chevauchement: (ox>0&&oy>0)?{x:+ox.toFixed(1),y:+oy.toFixed(1)}:null,
                ecartY:+(rc.y-ra.b).toFixed(1)};
      },[a,c,rect]);
      if(!d) { console.log(`  ${w}px ${nom}: ${a} ou ${c} absent`); continue; }
      const ch=d.chevauchement;
      console.log(`  ${String(w).padStart(4)}px ${nom.padEnd(9)} ${a} ↔ ${c} : `
        + (ch?`CHEVAUCHE ${ch.x}x${ch.y}px`:`0 chevauchement`) + `  (écart vertical ${d.ecartY}px)`);
    }
    await ctx.close();
  }
}
await b.close(); srv.close();
