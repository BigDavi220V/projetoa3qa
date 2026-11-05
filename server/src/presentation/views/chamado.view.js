/**
 * CAMADA DE APRESENTAÇÃO — Chamado View
 * Sanitiza os campos internos do banco antes de enviar o JSON para o cliente PWA.
 */

function formatarChamado(c) {
  if (!c) return null;
  return {
    id: c.id,
    protocolo: c.protocolo,
    tipo: c.tipo,
    status: c.status,
    lat: c.latitude != null ? Number(c.latitude) : null,
    lng: c.longitude != null ? Number(c.longitude) : null,
    acc: c.precisao_m != null ? Number(c.precisao_m) : null,
    descricao: c.descricao || '',
    endereco: c.endereco || '',
    fotoUrl: c.foto_url || null,
    posteId: c.poste_id || null,
    criadoEm: c.criado_em
  };
}

module.exports = formatarChamado;
