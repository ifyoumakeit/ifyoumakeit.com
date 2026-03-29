import request from 'supertest';
import { createApp } from '../../src/app';
import { createStore } from '../../src/store';

function freshApp() {
  return createApp(createStore());
}

describe('GET /api/sessions', () => {
  it('returns empty array initially', async () => {
    const res = await request(freshApp()).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/sessions', () => {
  it('creates a session', async () => {
    const res = await request(freshApp()).post('/api/sessions').send({ name: 'Practice Set 1' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Practice Set 1');
    expect(res.body.trackIds).toEqual([]);
  });

  it('creates a session with trackIds', async () => {
    const res = await request(freshApp())
      .post('/api/sessions')
      .send({ name: 'Set', trackIds: ['track-1', 'track-2'] });
    expect(res.status).toBe(201);
    expect(res.body.trackIds).toEqual(['track-1', 'track-2']);
  });

  it('rejects missing name', async () => {
    const res = await request(freshApp()).post('/api/sessions').send({ trackIds: [] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns a session by id', async () => {
    const app = freshApp();
    const create = await request(app).post('/api/sessions').send({ name: 'Set' });
    const res = await request(app).get(`/api/sessions/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Set');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).get('/api/sessions/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/sessions/:id', () => {
  it('updates a session', async () => {
    const app = freshApp();
    const create = await request(app).post('/api/sessions').send({ name: 'Original' });
    const res = await request(app)
      .patch(`/api/sessions/${create.body.id}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).patch('/api/sessions/nonexistent').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('deletes a session', async () => {
    const app = freshApp();
    const create = await request(app).post('/api/sessions').send({ name: 'Set' });
    const del = await request(app).delete(`/api/sessions/${create.body.id}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/sessions/${create.body.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).delete('/api/sessions/nonexistent');
    expect(res.status).toBe(404);
  });
});
