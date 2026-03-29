import { v4 as uuidv4 } from 'uuid';
import { Store } from '../store';
import { Session, CreateSessionInput, UpdateSessionInput } from '../types';

export class SessionsController {
  constructor(private readonly store: Store) {}

  list(): Session[] {
    return Array.from(this.store.sessions.values());
  }

  get(id: string): Session | undefined {
    return this.store.sessions.get(id);
  }

  create(input: CreateSessionInput): Session {
    const now = new Date().toISOString();
    const session: Session = {
      id: uuidv4(),
      name: input.name,
      trackIds: input.trackIds ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.sessions.set(session.id, session);
    return session;
  }

  update(id: string, input: UpdateSessionInput): Session | undefined {
    const existing = this.store.sessions.get(id);
    if (!existing) return undefined;
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined)
    ) as UpdateSessionInput;
    const updated: Session = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.store.sessions.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.store.sessions.delete(id);
  }
}
