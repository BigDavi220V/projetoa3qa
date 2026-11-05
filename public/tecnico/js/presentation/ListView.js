/**
 * CAMADA DE APRESENTAÇÃO (TÉCNICO) — ListView.js
 * Renderiza a lista de chamados abertos e contadores estatísticos no painel técnico.
 */

export class ListView {
  constructor(doc = typeof document !== 'undefined' ? document : null) {
    this.doc = doc;
  }

  $(id) {
    return this.doc ? this.doc.getElementById(id) : null;
  }

  atualizarEstatisticas({ total = '—', atendidos = '—', abertos = '—' } = {}) {
    if (this.$('stat-total')) this.$('stat-total').textContent = total;
    if (this.$('stat-done')) this.$('stat-done').textContent = atendidos;
    if (this.$('stat-open')) this.$('stat-open').textContent = abertos;
  }
}
