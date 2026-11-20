import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const portPosition = process.argv.indexOf('--port');
const portValue = portPosition < 0 ? 8080 : Number(process.argv[portPosition + 1]);
const port = Number.isInteger(portValue) && portValue > 0 && portValue < 65536 ? portValue : 8080;
const types: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

createServer((request, response) => {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }

  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filename = resolve(appRoot, `.${relative}`);
  if (filename !== appRoot && !filename.startsWith(`${appRoot}${sep}`)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  let size: number;
  try {
    const file = statSync(filename);
    if (!file.isFile()) throw new Error('not a file');
    size = file.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': types[extname(filename).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store'
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filename).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Leonida Field Notes is available at http://127.0.0.1:${port}`);
});
