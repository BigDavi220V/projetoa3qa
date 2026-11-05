/** Carrega o .env da raiz, preservando variáveis já definidas no ambiente. */
const path = require('node:path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true
});
