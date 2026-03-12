import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';

const options = {
  key: fs.readFileSync('./certificates/key.pem'),
  cert: fs.readFileSync('./certificates/cert.pem'),
};

https.createServer(options, (req, res) => {
  const proxyReq = http.request(
    { hostname: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
  req.pipe(proxyReq);
}).listen(3443, '0.0.0.0', () => {
  console.log('HTTPS proxy running on https://0.0.0.0:3443 -> http://127.0.0.1:3000');
});
