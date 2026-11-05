/**
 * CAMADA DE INFRAESTRUTURA (TÉCNICO) — CloseQueue.js
 * Fila local de baixas pendentes no IndexedDB (`ilumina_tec` / `close_queue`, máx. 10 itens).
 */

import { abrirBanco, executarTransacao } from '../../../shared/infrastructure/idb.js';

const DB_NAME = 'ilumina_tec';
const DB_VERSION = 1;
const STORE_QUEUE = 'close_queue';
const STORE_PHOTOS = 'citizen_photos';
export const MAX_QUEUE = 10;

export class CloseQueue {
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

  async adicionar(baixa) {
    const todos = await this.listarTodos();
    if (todos.length >= MAX_QUEUE) {
      throw new Error(`Limite de ${MAX_QUEUE} fechamentos offline atingido. Sincronize antes de continuar.`);
    }
    return executarTransacao(this._getDb(), STORE_QUEUE, 'readwrite', (store) =>
      store.add({
        payload: baixa,
        createdAt: Date.now(),
        attempts: 0,
        estado: 'pending'
      })
    );
  }

  async listarTodos() {
    const rows = await executarTransacao(this._getDb(), STORE_QUEUE, 'readonly', (store) => store.getAll());
    return rows || [];
  }

  async remover(id) {
    return executarTransacao(this._getDb(), STORE_QUEUE, 'readwrite', (store) => store.delete(id));
  }

  async marcarConflito(id, mensagemErro) {
    return executarTransacao(this._getDb(), STORE_QUEUE, 'readwrite', (store) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const rec = req.result;
        if (!rec) return;
        rec.estado = 'conflict';
        rec.lastError = mensagemErro;
        store.put(rec);
      };
    });
  }
}
