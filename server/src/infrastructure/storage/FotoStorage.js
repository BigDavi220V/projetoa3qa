/**
 * CAMADA DE INFRAESTRUTURA — Armazenamento de Fotos (FotoStorage)
 * Retira os blobs base64 de dentro do banco SQL, salvando em disco ou bucket S3/R2
 * e devolvendo apenas a URL pública/relativa para persistência na coluna `foto_url`.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const LIMITE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Salva uma imagem codificada em Data URL / Base64 e retorna a URL do arquivo.
 * Se nenhuma foto for enviada, retorna `null`.
 */
async function salvar(fotoBase64, opcoes = {}) {
  if (!fotoBase64 || typeof fotoBase64 !== 'string') return null;

  // Caso já seja uma URL HTTP/relativa, preserva
  if (/^https?:\/\//i.test(fotoBase64) || fotoBase64.startsWith('/uploads/')) {
    return fotoBase64;
  }

  const match = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i.exec(fotoBase64.trim());
  const ext = match ? (match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase()) : 'jpg';
  const base64Limpo = match ? match[2] : fotoBase64.replace(/^data:[^;]+;base64,/, '');

  const buffer = Buffer.from(base64Limpo, 'base64');
  if (buffer.length > LIMITE_BYTES) {
    const err = new Error('Foto excede o tamanho máximo permitido (5 MB).');
    err.status = 413;
    err.codigo = 'FOTO_MUITO_GRANDE';
    throw err;
  }

  const nomeArquivo = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  // Em ambiente de teste ou quando configurado apenas para memória, evita I/O desnecessário se solicitado
  if (opcoes.apenasSimular || process.env.STORAGE_DRIVER === 'memory') {
    return `/uploads/fotos/${nomeArquivo}`;
  }

  const pastaDestino = opcoes.diretorio || process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads/fotos');
  await fs.mkdir(pastaDestino, { recursive: true });
  await fs.writeFile(path.join(pastaDestino, nomeArquivo), buffer);

  return `/uploads/fotos/${nomeArquivo}`;
}

module.exports = {
  salvar,
  LIMITE_BYTES
};
