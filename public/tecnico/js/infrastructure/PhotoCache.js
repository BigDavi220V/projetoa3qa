/**
 * CAMADA DE INFRAESTRUTURA (TÉCNICO) — PhotoCache.js
 * Cacheia fotos dos chamados abertos em base64 no IndexedDB (`ilumina_tec` / `citizen_photos`)
 * para visualização em campo quando não há sinal de internet.
 */

import { abrirBanco, executarTransacao } from '../../../shared/infrastructure/idb.js';

const DB_NAME = 'ilumina_tec';
const DB_VERSION = 1;
const STORE_QUEUE = 'close_queue';
const STORE_PHOTOS = 'citizen_photos';

export class PhotoCache {
  constructor(dbName = DB_NAME, version = DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
    this._dbPromise = null;
  }

  _getDb() {
    if (!this._dbPromise) {
      this._dbPromise = abrirBanco(this.dbName, this.version, (db) => {
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'protocolo' });
        }
      });
    }
    return this._dbPromise;
  }

  async salvar(protocolo, dataUrl) {
    if (!protocolo || !dataUrl) return;
    return executarTransacao(this._getDb(), STORE_PHOTOS, 'readwrite', (store) =>
      store.put({ protocolo, dataUrl, savedAt: Date.now() })
    );
  }

  async obter(protocolo) {
    if (!protocolo) return null;
    const res = await executarTransacao(this._getDb(), STORE_PHOTOS, 'readonly', (store) =>
      store.get(protocolo)
    );
    return res ? res.dataUrl : null;
  }
}
