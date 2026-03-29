import { Router, Request, Response } from 'express';
import { SessionsController } from '../controllers/SessionsController';
import { Store } from '../store';

export function sessionsRouter(store: Store): Router {
  const router = Router();
  const controller = new SessionsController(store);

  router.get('/', (_req: Request, res: Response) => {
    res.json(controller.list());
  });

  router.get('/:id', (req: Request, res: Response) => {
    const session = controller.get(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, trackIds } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const session = controller.create({ name, trackIds: trackIds ?? [] });
    res.status(201).json(session);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const { name, trackIds } = req.body;
    const session = controller.update(req.params.id, { name, trackIds });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = controller.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
