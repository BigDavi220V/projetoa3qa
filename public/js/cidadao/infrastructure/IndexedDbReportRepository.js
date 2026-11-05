/**
 * CAMADA DE INFRAESTRUTURA (CIDADÃO) — IndexedDbReportRepository.js
 * Persistência local dos reportes na store `reports` do banco `ilumina_v2`.
 */

import { abrirBanco, executarTransacao } from '../../../shared/infrastructure/idb.js';
import { ESTADOS_SYNC } from '../domain/Report.js';

const DB_NAME = 'ilumina_v2';
const DB_VERSION = 1;
const STORE = 'reports';

export class IndexedDbReportRepository {
  constructor(dbName = DB_NAME, version = DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
    this._dbPromise = null;
  }

  _getDb() {
    if (!this._dbPromise) {
      this._dbPromise = abrirBanco(this.dbName, this.version, (db) => {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      });
    }
    return this._dbPromise;
  }

  async salvar(report) {
    const registro = {
      id: report.id,
      payload: report,
      createdAt: Date.now(),
      attempts: report.sync ? report.sync.attempts : 0,
      estado: report.sync ? report.sync.estado : ESTADOS_SYNC.PENDING,
      nextRetryAt: report.sync ? report.sync.nextRetryAt : null,
      lastError: report.sync ? report.sync.lastError : null
    };
    return executarTransacao(this._getDb(), STORE, 'readwrite', (store) => store.put(registro));
  }

  async listarTodos() {
    const raw = await executarTransacao(this._getDb(), STORE, 'readonly', (store) => store.getAll());
    return (raw || []).map((item) => this._normalizarRegistro(item));
  }

  async listarPendentes() {
    const todos = await this.listarTodos();
    return todos.filter(
      (r) => r.sync.estado === ESTADOS_SYNC.PENDING || r.sync.estado === ESTADOS_SYNC.SYNCING
    );
  }

  async marcar(id, novoEstado, metadados = {}) {
    return executarTransacao(this._getDb(), STORE, 'readwrite', (store) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const atual = getReq.result;
        if (!atual) return;
        if (novoEstado === ESTADOS_SYNC.SYNCED && metadados.removerAoSincronizar !== false) {
          store.delete(id);
          return;
        }
        const attempts = metadados.incrementarTentativa
          ? (atual.attempts || 0) + 1
          : (metadados.attempts !== undefined ? metadados.attempts : (atual.attempts || 0));

        atual.estado = novoEstado;
        atual.attempts = attempts;
        atual.lastError = metadados.erro || null;
        atual.nextRetryAt = metadados.nextRetryAt || null;
        if (atual.payload && atual.payload.sync) {
          atual.payload.sync = {
            estado: novoEstado,
            attempts,
            lastError: atual.lastError,
            nextRetryAt: atual.nextRetryAt
          };
        }
        store.put(atual);
      };
    });
  }

  async remover(id) {
    return executarTransacao(this._getDb(), STORE, 'readwrite', (store) => store.delete(id));
  }

  _normalizarRegistro(item) {
    const base = item.payload || item;
    return {
      ...base,
      id: item.id || base.id,
      sync: {
        estado: item.estado || (base.sync && base.sync.estado) || ESTADOS_SYNC.PENDING,
        attempts: item.attempts ?? (base.sync && base.sync.attempts) ?? 0,
        lastError: item.lastError ?? (base.sync && base.sync.lastError) ?? null,
        nextRetryAt: item.nextRetryAt ?? (base.sync && base.sync.nextRetryAt) ?? null
      }
    };
  }
}
