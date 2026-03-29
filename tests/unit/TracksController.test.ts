import { TracksController } from '../../src/controllers/TracksController';
import { createStore } from '../../src/store';

describe('TracksController', () => {
  let controller: TracksController;

  beforeEach(() => {
    controller = new TracksController(createStore());
  });

  it('returns empty list initially', () => {
    expect(controller.list()).toEqual([]);
  });

  it('creates a track with required fields', () => {
    const track = controller.create({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      durationSeconds: 354,
    });
    expect(track.id).toBeDefined();
    expect(track.title).toBe('Bohemian Rhapsody');
    expect(track.artist).toBe('Queen');
    expect(track.durationSeconds).toBe(354);
    expect(track.createdAt).toBeDefined();
    expect(track.updatedAt).toBeDefined();
  });

  it('creates a track with optional genre', () => {
    const track = controller.create({
      title: 'Thriller',
      artist: 'Michael Jackson',
      durationSeconds: 358,
      genre: 'Pop',
    });
    expect(track.genre).toBe('Pop');
  });

  it('lists all created tracks', () => {
    controller.create({ title: 'Track A', artist: 'Artist A', durationSeconds: 200 });
    controller.create({ title: 'Track B', artist: 'Artist B', durationSeconds: 300 });
    expect(controller.list()).toHaveLength(2);
  });

  it('gets a track by id', () => {
    const created = controller.create({
      title: 'Track A',
      artist: 'Artist A',
      durationSeconds: 200,
    });
    const found = controller.get(created.id);
    expect(found).toEqual(created);
  });

  it('returns undefined for unknown id', () => {
    expect(controller.get('nonexistent')).toBeUndefined();
  });

  it('updates a track', () => {
    const created = controller.create({
      title: 'Original',
      artist: 'Artist',
      durationSeconds: 200,
    });
    const updated = controller.update(created.id, { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
    expect(updated?.artist).toBe('Artist');
    expect(updated?.updatedAt).toBeDefined();
  });

  it('returns undefined when updating nonexistent track', () => {
    expect(controller.update('nonexistent', { title: 'X' })).toBeUndefined();
  });

  it('deletes a track', () => {
    const created = controller.create({ title: 'Track', artist: 'Artist', durationSeconds: 100 });
    expect(controller.delete(created.id)).toBe(true);
    expect(controller.get(created.id)).toBeUndefined();
  });

  it('returns false when deleting nonexistent track', () => {
    expect(controller.delete('nonexistent')).toBe(false);
  });
});
