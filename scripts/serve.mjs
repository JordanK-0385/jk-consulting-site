/* Serveur local de développement. Le site n'a pas d'étape de build :
   ce qui est servi ici est exactement ce qui est déployé. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8000);
const TYPES = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
                '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
                '.json':'application/json' };

createServer(async (q, r) => {
  let f = join(process.cwd(), decodeURI(q.url.split('?')[0]));
  if (f.endsWith('/')) f = join(f, 'index.html');
  try {
    const d = await readFile(f);
    r.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'text/plain' });
    r.end(d);
  } catch {
    r.writeHead(404, { 'Content-Type': 'text/plain' });
    r.end('404');
  }
}).listen(PORT, () => console.log(`http://127.0.0.1:${PORT}/`));
