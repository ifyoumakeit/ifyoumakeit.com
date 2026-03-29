import { SessionsController } from '../../src/controllers/SessionsController';
import { createStore } from '../../src/store';

describe('SessionsController', () => {
  let controller: SessionsController;

  beforeEach(() => {
    controller = new SessionsController(createStore());
  });

  it('returns empty list initially', () => {
    expect(controller.list()).toEqual([]);
  });

  it('creates a session', () => {
    const session = controller.create({ name: 'Practice Set 1', trackIds: [] });
    expect(session.id).toBeDefined();
    expect(session.name).toBe('Practice Set 1');
    expect(session.trackIds).toEqual([]);
  });

  it('creates a session with track ids', () => {
    const session = controller.create({ name: 'Set', trackIds: ['track-1', 'track-2'] });
    expect(session.trackIds).toEqual(['track-1', 'track-2']);
  });

  it('defaults trackIds to empty array when omitted', () => {
    const session = controller.create({ name: 'Set', trackIds: [] });
    expect(session.trackIds).toEqual([]);
  });

  it('lists all sessions', () => {
    controller.create({ name: 'Set 1', trackIds: [] });
    controller.create({ name: 'Set 2', trackIds: [] });
    expect(controller.list()).toHaveLength(2);
  });

  it('gets a session by id', () => {
    const created = controller.create({ name: 'Set', trackIds: [] });
    expect(controller.get(created.id)).toEqual(created);
  });

  it('returns undefined for unknown id', () => {
    expect(controller.get('nonexistent')).toBeUndefined();
  });

  it('updates a session', () => {
    const created = controller.create({ name: 'Original', trackIds: [] });
    const updated = controller.update(created.id, { name: 'Updated' });
    expect(updated?.name).toBe('Updated');
    expect(updated?.updatedAt).toBeDefined();
  });

  it('returns undefined when updating nonexistent session', () => {
    expect(controller.update('nonexistent', { name: 'X' })).toBeUndefined();
  });

  it('deletes a session', () => {
    const created = controller.create({ name: 'Set', trackIds: [] });
    expect(controller.delete(created.id)).toBe(true);
    expect(controller.get(created.id)).toBeUndefined();
  });

  it('returns false when deleting nonexistent session', () => {
    expect(controller.delete('nonexistent')).toBe(false);
  });
});
