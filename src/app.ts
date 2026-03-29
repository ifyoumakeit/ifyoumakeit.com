import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Store } from './store';
import { healthRouter } from './routes/health';
import { tracksRouter } from './routes/tracks';
import { sessionsRouter } from './routes/sessions';

export function createApp(store: Store): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter());
  app.use('/api/tracks', tracksRouter(store));
  app.use('/api/sessions', sessionsRouter(store));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
