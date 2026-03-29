import { Track, Session } from '../types';

export interface Store {
  tracks: Map<string, Track>;
  sessions: Map<string, Session>;
}

export function createStore(): Store {
  return {
    tracks: new Map(),
    sessions: new Map(),
  };
}

export const store = createStore();
