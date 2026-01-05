const registry = new Map();

export const registerPlayer = (url, player) => {
  if (!url || !player) return;
  registry.set(url, player);
};

export const getPlayer = (url) => {
  if (!url) return null;
  return registry.get(url) || null;
};

export const removePlayer = (url) => {
  if (!url) return;
  const p = registry.get(url);
  try { if (p && typeof p.release === 'function') p.release(); } catch (e) {}
  registry.delete(url);
};

export const clearRegistry = () => {
  for (const [k, p] of registry.entries()) {
    try { if (p && typeof p.release === 'function') p.release(); } catch (e) {}
  }
  registry.clear();
};

export default {
  registerPlayer,
  getPlayer,
  removePlayer,
  clearRegistry,
};
