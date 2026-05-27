import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

app.use(cors());

// Preserve raw body for RevenueCat webhook HMAC verification
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// Request logger — one line per request (method, path, status, duration).
// Proves whether a request (e.g. a RevenueCat webhook POST) reached the server.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[req] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.use(routes);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running on http://0.0.0.0:${PORT}`);
});
