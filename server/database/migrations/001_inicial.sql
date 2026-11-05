-- ============================================================================
-- ILUMINA CORURIPE — Migration 001: Esquema Inicial PostgreSQL
-- Arquitetura em Camadas em Monólito Modular (Cliente-Servidor 3-Tier)
-- ============================================================================

BEGIN;

-- 1. USUÁRIOS (Técnicos, Gestores e Almoxarifes)
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  perfil      VARCHAR(20)  NOT NULL CHECK (perfil IN ('tecnico', 'gestor', 'almoxarife')),
  pin_hash    VARCHAR(255) NOT NULL,          -- Hash seguro do PIN (nunca texto puro)
  ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. SESSÕES (Autenticação Stateless via Bearer Token)
CREATE TABLE IF NOT EXISTS sessoes (
  token       CHAR(64) PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em   TIMESTAMPTZ NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);

-- 3. TENTATIVAS DE LOGIN (Proteção contra Força Bruta no PIN de 4 dígitos)
CREATE TABLE IF NOT EXISTS tentativas_login (
  id          SERIAL PRIMARY KEY,
  ip          VARCHAR(45) NOT NULL,
  perfil      VARCHAR(20),
  sucesso     BOOLEAN NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tentativas_login_ip_tempo ON tentativas_login(ip, criado_em);

-- 4. POSTES (Cadastro e Configuração Técnica da Rede de Iluminação)
CREATE TABLE IF NOT EXISTS postes (
  id             VARCHAR(20) PRIMARY KEY,      -- Ex.: 'P-0001' (idêntico ao QR Code físico)
  codigo         VARCHAR(60),
  bairro         VARCHAR(120),
  rua            VARCHAR(200),
  referencia     VARCHAR(255),
  endereco       VARCHAR(255),
  latitude       NUMERIC(9,6),
  longitude      NUMERIC(9,6),
  braco          VARCHAR(60),
  luminaria      VARCHAR(60),
  reator         VARCHAR(60),
  fotosensor     VARCHAR(60),
  porta_fusivel  VARCHAR(60),
  fusivel        VARCHAR(60),
  cabo           VARCHAR(60),
  conector       VARCHAR(60),
  foto_ref_url   VARCHAR(500),
  obs            TEXT,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CHAMADOS (Reportes dos Cidadãos — Idempotentes via UUID gerado no PWA)
CREATE TABLE IF NOT EXISTS chamados (
  id           UUID PRIMARY KEY,               -- Gerado no celular (garante idempotência)
  protocolo    VARCHAR(30) UNIQUE NOT NULL,    -- Ex.: 'IC-261104-AB12C'
  tipo         VARCHAR(40) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'aberto'
               CHECK (status IN ('aberto', 'em_atendimento', 'fechado', 'cancelado')),
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  precisao_m   INT,
  descricao    TEXT,
  nome         VARCHAR(120),
  telefone     VARCHAR(30),
  endereco     VARCHAR(255),
  foto_url     VARCHAR(500),                   -- Caminho/URL da foto fora do banco
  poste_id     VARCHAR(20) REFERENCES postes(id),
  user_agent   VARCHAR(180),
  criado_em    TIMESTAMPTZ NOT NULL,           -- Data/hora capturada no aparelho
  recebido_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_poste  ON chamados(poste_id);

-- 6. TENTATIVAS DE ATENDIMENTO (Visitas em campo sem resolução imediata)
CREATE TABLE IF NOT EXISTS tentativas (
  id           SERIAL PRIMARY KEY,
  operacao_id  UUID UNIQUE NOT NULL,           -- Evita duplicação no reenvio da fila offline
  chamado_id   UUID NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  tecnico_id   INT  NOT NULL REFERENCES usuarios(id),
  motivo       TEXT NOT NULL,
  latitude     NUMERIC(9,6),
  longitude    NUMERIC(9,6),
  foto_url     VARCHAR(500),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tentativas_chamado ON tentativas(chamado_id);

-- 7. FECHAMENTOS (Baixa Técnica em Campo ou Fechamento Administrativo)
CREATE TABLE IF NOT EXISTS fechamentos (
  id              SERIAL PRIMARY KEY,
  operacao_id     UUID UNIQUE NOT NULL,        -- Idempotência da fila offline do técnico
  chamado_id      UUID UNIQUE NOT NULL REFERENCES chamados(id) ON DELETE CASCADE, -- 1 fechamento por chamado
  tecnico_id      INT REFERENCES usuarios(id),
  status          VARCHAR(40) NOT NULL,
  servico         TEXT,
  referencia      VARCHAR(255),
  latitude        NUMERIC(9,6),
  longitude       NUMERIC(9,6),
  foto_url        VARCHAR(500),
  administrativo  BOOLEAN NOT NULL DEFAULT FALSE,
  informante      VARCHAR(120),
  justificativa   TEXT,
  data_fechamento TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ITENS DE ESTOQUE (Almoxarifado Municipal)
CREATE TABLE IF NOT EXISTS itens_estoque (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) UNIQUE NOT NULL,
  unidade       VARCHAR(20)  NOT NULL DEFAULT 'un',
  saldo         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0), -- Impede estoque negativo no banco
  minimo        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. MATERIAIS USADOS NO FECHAMENTO
CREATE TABLE IF NOT EXISTS fechamento_materiais (
  fechamento_id INT NOT NULL REFERENCES fechamentos(id) ON DELETE CASCADE,
  item_id       INT NOT NULL REFERENCES itens_estoque(id),
  quantidade    NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  PRIMARY KEY (fechamento_id, item_id)
);

-- 10. MISSÕES DE SAÍDA E RETORNO DE MATERIAIS
CREATE TABLE IF NOT EXISTS missoes (
  id         SERIAL PRIMARY KEY,
  data       DATE NOT NULL,
  equipe     VARCHAR(120) NOT NULL,
  obs        TEXT,
  criado_por INT REFERENCES usuarios(id),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missao_itens (
  missao_id   INT NOT NULL REFERENCES missoes(id) ON DELETE CASCADE,
  item_id     INT NOT NULL REFERENCES itens_estoque(id),
  qtd_saida   NUMERIC(10,2) NOT NULL CHECK (qtd_saida > 0),
  qtd_retorno NUMERIC(10,2) CHECK (qtd_retorno IS NULL OR qtd_retorno >= 0),
  PRIMARY KEY (missao_id, item_id)
);

COMMIT;
