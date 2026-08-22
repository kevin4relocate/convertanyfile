import type { EngineAdapter, EngineId } from './types';

const loaders: Record<EngineId, () => Promise<EngineAdapter>> = {
  image: async () => (await import('../../engines/image/runtime')).imageEngine,
  data: async () => (await import('../../engines/data/runtime')).dataEngine,
  archive: async () => (await import('../../engines/archive/runtime')).archiveEngine,
  subtitle: async () => (await import('../../engines/subtitle/runtime')).subtitleEngine,
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
