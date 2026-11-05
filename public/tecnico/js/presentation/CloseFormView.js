/**
 * CAMADA DE APRESENTAÇÃO (TÉCNICO) — CloseFormView.js
 * Manipula o formulário de fechamento (baixa) e exibe avisos de conflito (409) ou fila offline.
 */

export class CloseFormView {
  constructor(doc = typeof document !== 'undefined' ? document : null) {
    this.doc = doc;
  }

  $(id) {
    return this.doc ? this.doc.getElementById(id) : null;
  }

  atualizarBannerFila(qtdPendentes, online = true) {
    const banner = this.$('pending-banner');
    if (!banner) return;
    if (qtdPendentes > 0) {
      banner.classList.add('show');
      const txt = banner.querySelector('.pending-text');
      if (txt) {
        txt.textContent = `${qtdPendentes} ${qtdPendentes === 1 ? 'fechamento pendente' : 'fechamentos pendentes'} — ${online ? 'enviando…' : 'salvo neste aparelho (sem sinal)'}`;
      }
    } else {
      banner.classList.remove('show');
    }
  }
}
