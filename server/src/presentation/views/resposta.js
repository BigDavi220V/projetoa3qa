/**
 * CAMADA DE APRESENTAÇÃO — View JSON Padrão
 * Garante que todas as respostas da API sigam o contrato `{ success: boolean, data | error }`.
 */

function ok(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    ok: true,
    data
  });
}

function erro(res, status, codigo, mensagem, detalhes) {
  const payload = {
    success: false,
    ok: false,
    error: {
      codigo,
      mensagem,
      ...(detalhes && detalhes.length ? { detalhes } : {})
    }
  };
  return res.status(status).json(payload);
}

module.exports = { ok, erro };
