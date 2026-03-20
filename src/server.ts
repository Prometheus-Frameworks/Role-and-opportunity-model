import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { app } from './app.ts';
import { getRuntimeConfig, SERVICE_NAME } from './config/service.ts';

const runtimeConfig = getRuntimeConfig();
const { port, host, tiberDataBaseUrl } = runtimeConfig;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled server error';
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: 'Internal server error',
        message,
      }),
    );
  }
});

server.keepAliveTimeout = 61_000;
server.headersTimeout = 62_000;
server.requestTimeout = 60_000;

const shutdown = (signal: NodeJS.Signals) => {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown', service: SERVICE_NAME, signal }));
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'startup',
      service: SERVICE_NAME,
      host,
      port,
      tiberDataBaseUrl,
    }),
  );
});
