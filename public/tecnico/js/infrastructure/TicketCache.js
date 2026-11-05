/**
 * CAMADA DE INFRAESTRUTURA (TÉCNICO) — TicketCache.js
 * Cache local da lista de chamados (`localStorage: ilu_tech_list_cache`) para operação sem sinal.
 */

const LIST_CACHE_KEY = 'ilu_tech_list_cache';

export class TicketCache {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
  }

  salvar(records, stats = null) {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        LIST_CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          records: Array.isArray(records) ? records : [],
          stats
        })
      );
    } catch (_) {}
  }

  carregar() {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(LIST_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
}
