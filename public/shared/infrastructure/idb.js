/**
 * CAMADA DE INFRAESTRUTURA COMPARTILHADA — Utilitário de IndexedDB (idb.js)
 * Encapsula a API baseada em eventos do IndexedDB em Promises limpas para
 * as filas offline (`ilumina_v2` no cidadão e `ilumina_tec` no técnico).
 */

export function abrirBanco(nomeBanco, versao, configurarStores) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB não suportado neste ambiente.'));
    }
    const req = indexedDB.open(nomeBanco, versao);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (typeof configurarStores === 'function') {
        configurarStores(db, event.oldVersion, event.newVersion);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function executarTransacao(dbPromise, storeName, modo, operacao) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, modo);
    const store = tx.objectStore(storeName);
    let reqResult;
    try {
      const req = operacao(store, tx);
      if (req && 'onsuccess' in req) {
        req.onsuccess = () => { reqResult = req.result; };
        req.onerror = () => reject(req.error);
      } else {
        reqResult = req;
      }
    } catch (err) {
      return reject(err);
    }
    tx.oncomplete = () => resolve(reqResult);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transação IndexedDB abortada.'));
  });
}
