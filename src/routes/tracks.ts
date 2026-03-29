import { Router, Request, Response } from 'express';
import { TracksController } from '../controllers/TracksController';
import { Store } from '../store';

export function tracksRouter(store: Store): Router {
  const router = Router();
  const controller = new TracksController(store);

  router.get('/', (_req: Request, res: Response) => {
    res.json(controller.list());
  });

  router.get('/:id', (req: Request, res: Response) => {
    const track = controller.get(req.params.id);
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    res.json(track);
  });

  router.post('/', (req: Request, res: Response) => {
    const { title, artist, durationSeconds, genre } = req.body;
    if (!title || !artist || durationSeconds == null) {
      res.status(400).json({ error: 'title, artist, and durationSeconds are required' });
      return;
    }
    if (typeof durationSeconds !== 'number' || durationSeconds <= 0) {
      res.status(400).json({ error: 'durationSeconds must be a positive number' });
      return;
    }
    const track = controller.create({ title, artist, durationSeconds, genre });
    res.status(201).json(track);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const { title, artist, durationSeconds, genre } = req.body;
    if (
      durationSeconds !== undefined &&
      (typeof durationSeconds !== 'number' || durationSeconds <= 0)
    ) {
      res.status(400).json({ error: 'durationSeconds must be a positive number' });
      return;
    }
    const track = controller.update(req.params.id, { title, artist, durationSeconds, genre });
    if (!track) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    res.json(track);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = controller.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Track not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
