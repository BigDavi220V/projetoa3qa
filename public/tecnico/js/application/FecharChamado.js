/**
 * CAMADA DE APLICAÇÃO (TÉCNICO) — FecharChamado.js
 * Caso de uso: validar a baixa do chamado, salvar PRIMEIRO na fila local (`CloseQueue`)
 * para operação Offline-First e disparar a sincronização com o servidor.
 */

import { criarBaixa, validarBaixa } from '../domain/Close.js';

export async function fecharChamado(dadosFormulario, { queue, sincronizar }) {
  const baixa = criarBaixa(dadosFormulario);
  const erros = validarBaixa(baixa);

  if (erros.length > 0) {
    return {
      sucesso: false,
      erros,
      baixa: null
    };
  }

  // 1. Grava primeiro na fila local (IndexedDB ilumina_tec/close_queue)
  await queue.adicionar(baixa);

  // 2. Tenta sincronizar com o servidor se online
  let resultadoSync = null;
  if (typeof sincronizar === 'function') {
    resultadoSync = await sincronizar();
  }

  return {
    sucesso: true,
    erros: [],
    baixa,
    sincronizado: Boolean(resultadoSync && resultadoSync.sincronizados > 0),
    conflitos: (resultadoSync && resultadoSync.conflitos) || []
  };
}
