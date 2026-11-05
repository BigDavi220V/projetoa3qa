/**
 * CAMADA DE APRESENTAÇÃO (TÉCNICO / ALMOXARIFADO) — StockView.js
 * Manipula a interface de estoque e missões do almoxarifado.
 */

export class StockView {
  constructor(doc = typeof document !== 'undefined' ? document : null) {
    this.doc = doc;
  }

  $(id) {
    return this.doc ? this.doc.getElementById(id) : null;
  }

  lerFormularioItem() {
    return {
      nome: (this.$('est-item') && this.$('est-item').value) || '',
      unidade: (this.$('est-unidade') && this.$('est-unidade').value) || 'un',
      saldo: Number((this.$('est-saldo') && this.$('est-saldo').value) || 0),
      minimo: Number((this.$('est-minimo') && this.$('est-minimo').value) || 0)
    };
  }
}
