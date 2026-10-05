// Memory-only bridge for non-hook API callers. Auth SDK owns token persistence.
let current: { token: string | null; generation: number } = { token: null, generation: 0 };
const listeners = new Set<() => void>();
export const commercialSession = {
  get: () => current,
  set(token: string | null) {
    if (current.token === token) return;
    current = { token, generation: current.generation + 1 };
    for (const listener of listeners) listener();
  },
  clear() {
    current = { token: null, generation: current.generation + 1 };
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  isCurrent(generation: number) { return generation === current.generation; },
};

// Shared by provider cleanup and tested independently of native persistence.
export function releaseCommercialAuth(client: { close(): Promise<void> } | null) {
  commercialSession.clear();
  if (client) void client.close();
}
