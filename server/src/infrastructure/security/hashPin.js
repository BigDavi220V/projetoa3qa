/**
 * CAMADA DE INFRAESTRUTURA — Segurança de PIN (Hash + Comparação em Tempo Constante)
 * Utiliza scrypt nativo do Node.js (zero dependências externas com C++ nativo)
 * e suporta leitura de hashes bcrypt caso migrados.
 */

const crypto = require('node:crypto');

const SALT_LEN = 16;
const KEY_LEN = 64;

/**
 * Gera um hash seguro com salt aleatório para armazenar o PIN na coluna `pin_hash`.
 */
async function gerarHashPin(pin) {
  const pinStr = String(pin || '').trim();
  if (!pinStr) throw new Error('PIN não pode ser vazio.');

  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(pinStr, salt, KEY_LEN, (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });

  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica um PIN contra o hash salvo usando comparação resistente a timing attacks.
 */
async function verificarPin(pinDigitado, pinHashSalvo) {
  if (!pinDigitado || !pinHashSalvo) return false;
  const pinStr = String(pinDigitado).trim();

  if (pinHashSalvo.startsWith('scrypt$')) {
    const partes = pinHashSalvo.split('$');
    if (partes.length !== 3) return false;
    const [, salt, hashHex] = partes;

    const derivedKey = await new Promise((resolve, reject) => {
      crypto.scrypt(pinStr, salt, KEY_LEN, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    const bufferSalvo = Buffer.from(hashHex, 'hex');
    if (bufferSalvo.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(bufferSalvo, derivedKey);
  }

  return false;
}

module.exports = {
  gerarHashPin,
  verificarPin
};
