import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { app } from './app.ts';

const port = Number(process.env.PORT ?? '3000');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req,
    duplex: 'half',
  });

  const response = await app.fetch(request);

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

  if (!response.body) {
    res.end();
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
});

server.listen(port, () => {
  console.log(`role-and-opportunity-model listening on port ${port}`);
});
