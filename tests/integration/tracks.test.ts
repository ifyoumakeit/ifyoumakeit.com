import request from 'supertest';
import { createApp } from '../../src/app';
import { createStore } from '../../src/store';

function freshApp() {
  return createApp(createStore());
}

describe('GET /api/tracks', () => {
  it('returns empty array initially', async () => {
    const res = await request(freshApp()).get('/api/tracks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/tracks', () => {
  it('creates a track', async () => {
    const app = freshApp();
    const res = await request(app)
      .post('/api/tracks')
      .send({ title: 'Let It Be', artist: 'The Beatles', durationSeconds: 243 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Let It Be');
    expect(res.body.artist).toBe('The Beatles');
    expect(res.body.durationSeconds).toBe(243);
  });

  it('rejects missing title', async () => {
    const res = await request(freshApp())
      .post('/api/tracks')
      .send({ artist: 'Artist', durationSeconds: 100 });
    expect(res.status).toBe(400);
  });

  it('rejects missing artist', async () => {
    const res = await request(freshApp())
      .post('/api/tracks')
      .send({ title: 'Title', durationSeconds: 100 });
    expect(res.status).toBe(400);
  });

  it('rejects missing durationSeconds', async () => {
    const res = await request(freshApp())
      .post('/api/tracks')
      .send({ title: 'Title', artist: 'Artist' });
    expect(res.status).toBe(400);
  });

  it('rejects zero durationSeconds', async () => {
    const res = await request(freshApp())
      .post('/api/tracks')
      .send({ title: 'Title', artist: 'Artist', durationSeconds: 0 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tracks/:id', () => {
  it('returns a track by id', async () => {
    const app = freshApp();
    const create = await request(app)
      .post('/api/tracks')
      .send({ title: 'Song', artist: 'Artist', durationSeconds: 180 });
    const res = await request(app).get(`/api/tracks/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Song');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).get('/api/tracks/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tracks/:id', () => {
  it('updates a track', async () => {
    const app = freshApp();
    const create = await request(app)
      .post('/api/tracks')
      .send({ title: 'Original', artist: 'Artist', durationSeconds: 180 });
    const res = await request(app)
      .patch(`/api/tracks/${create.body.id}`)
      .send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.artist).toBe('Artist');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).patch('/api/tracks/nonexistent').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tracks/:id', () => {
  it('deletes a track', async () => {
    const app = freshApp();
    const create = await request(app)
      .post('/api/tracks')
      .send({ title: 'Song', artist: 'Artist', durationSeconds: 180 });
    const del = await request(app).delete(`/api/tracks/${create.body.id}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/tracks/${create.body.id}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(freshApp()).delete('/api/tracks/nonexistent');
    expect(res.status).toBe(404);
  });
});
