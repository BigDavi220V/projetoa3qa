/**
 * CAMADA DE INFRAESTRUTURA — Geração de Token de Sessão Criptograficamente Seguro
 */

const crypto = require('node:crypto');

/**
 * Gera um token hexadecimal de 64 caracteres (256 bits de entropia)
 * compatível com a coluna `sessoes.token CHAR(64)`.
 */
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { gerarToken };
