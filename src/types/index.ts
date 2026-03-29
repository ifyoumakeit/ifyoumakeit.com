export interface Track {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  genre?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateTrackInput = Omit<Track, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTrackInput = Partial<CreateTrackInput>;

export interface Session {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreateSessionInput = Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSessionInput = Partial<CreateSessionInput>;
