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

  prepararRegistros(registros) {
    return registros.map(registro => ({
      ...registro,
      status: ['aberto', 'em_atendimento'].includes(registro.status) ? 'Aguardando atendimento'
        : registro.status === 'fechado' ? 'Concluído' : registro.status,
      data: registro.criadoEm ? new Date(registro.criadoEm).toLocaleString('pt-BR') : '',
      foto_thumb: registro.fotoUrl || '',
      foto: registro.fotoUrl || ''
    }));
  }

  atualizarEstatisticas({ total = '—', atendidos = '—', abertos = '—' } = {}) {
    if (this.$('stat-total')) this.$('stat-total').textContent = total;
    if (this.$('stat-done')) this.$('stat-done').textContent = atendidos;
    if (this.$('stat-open')) this.$('stat-open').textContent = abertos;
  }
}
