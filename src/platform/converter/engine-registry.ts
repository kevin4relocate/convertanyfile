import type { EngineAdapter, EngineId } from './types';

const loaders: Record<EngineId, () => Promise<EngineAdapter>> = {
  image: async () => (await import('../../engines/image/runtime')).imageEngine,
};

const cache = new Map<EngineId, Promise<EngineAdapter>>();

export function loadEngine(id: EngineId): Promise<EngineAdapter> {
  let promise = cache.get(id);
  if (!promise) {
    promise = loaders[id]();
    cache.set(id, promise);
  }
  return promise;
}
