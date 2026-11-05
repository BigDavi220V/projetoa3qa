/**
 * CAMADA DE APRESENTAÇÃO (TÉCNICO) — Controllers.js
 * Coordena os fluxos de tela do Técnico, Gestor e Almoxarife com os serviços da Camada de Aplicação.
 */

import { fecharChamado } from '../application/FecharChamado.js';
import { sincronizarBaixas } from '../application/SincronizarBaixas.js';
import { gerarRotaOtimizada } from '../application/CarregarRota.js';

export class TechnicalControllers {
  constructor({ listView, closeFormView, stockView, ticketCache, closeQueue, photoCache, api }) {
    this.listView = listView;
    this.closeFormView = closeFormView;
    this.stockView = stockView;
    this.ticketCache = ticketCache;
    this.closeQueue = closeQueue;
    this.photoCache = photoCache;
    this.api = api;
  }

  async registrarBaixa(dadosFormulario, token) {
    return fecharChamado(dadosFormulario, {
      queue: this.closeQueue,
      sincronizar: () => this.sincronizarFila(token)
    });
  }

  async sincronizarFila(token) {
    return sincronizarBaixas({
      queue: this.closeQueue,
      api: this.api,
      token
    });
  }

  calcularRotaDoDia(chamados, pontoPartida) {
    return gerarRotaOtimizada(chamados, pontoPartida);
  }
}
