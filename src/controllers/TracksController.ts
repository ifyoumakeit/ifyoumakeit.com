import { v4 as uuidv4 } from 'uuid';
import { Store } from '../store';
import { Track, CreateTrackInput, UpdateTrackInput } from '../types';

export class TracksController {
  constructor(private readonly store: Store) {}

  list(): Track[] {
    return Array.from(this.store.tracks.values());
  }

  get(id: string): Track | undefined {
    return this.store.tracks.get(id);
  }

  create(input: CreateTrackInput): Track {
    const now = new Date().toISOString();
    const track: Track = {
      id: uuidv4(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.store.tracks.set(track.id, track);
    return track;
  }

  update(id: string, input: UpdateTrackInput): Track | undefined {
    const existing = this.store.tracks.get(id);
    if (!existing) return undefined;
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined)
    ) as UpdateTrackInput;
    const updated: Track = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.tracks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.tracks.delete(id);
  }
}
