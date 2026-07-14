-- backend/app/sql/rh/31_documentos_colaborador.sql
-- Gestão documental por colaborador — pasta pessoal organizada por ano.
-- Documento independente de qualquer registo específico (falta/participação);
-- por isso tabela própria em vez de reutilizar o padrão JSONB de tb_rh_faltas/
-- tb_rh_participacao. Acesso: só rh.admin faz upload/remoção; o colaborador
-- vê/descarrega só os seus próprios; superior hierárquico sem acesso.
-- Executar DEPOIS de 30_tipo_contrato_simplificado.sql

-- ═══════════════════════════════════════════════════════════════
-- 1. Lookup: categorias de documento
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tt_rh_tipo_documento (
    pk    SERIAL      PRIMARY KEY,
    descr VARCHAR(60) NOT NULL,
    ativo BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO tt_rh_tipo_documento (descr) VALUES
  ('Contrato de Trabalho'),
  ('Exame de Medicina no Trabalho'),
  ('Certificado/Formação'),
  ('Avaliação de Desempenho'),
  ('Correspondência'),
  ('Outro')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. Tabela principal
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_rh_documento (
    pk            INTEGER      NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk    INTEGER      NOT NULL REFERENCES ts_client(pk),
    -- NULL = documento "geral", não associado a um ano específico
    -- (ex: o próprio contrato de trabalho)
    ano           INTEGER,
    tt_tipo_fk    INTEGER      NOT NULL REFERENCES tt_rh_tipo_documento(pk),
    nome_original VARCHAR(255) NOT NULL,
    filename      VARCHAR(255) NOT NULL,
    tamanho       INTEGER,
    notas         TEXT,
    uploaded_by   INTEGER      REFERENCES ts_client(pk),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_tb_rh_documento PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_tb_rh_documento_user_ano ON tb_rh_documento (tb_user_fk, ano);

-- ═══════════════════════════════════════════════════════════════
-- 3. View de leitura
-- ═══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS vbl_rh_documento CASCADE;
CREATE VIEW vbl_rh_documento AS
SELECT
    d.pk,
    d.tb_user_fk,
    c.name          AS colaborador_nome,
    d.ano,
    d.tt_tipo_fk,
    t.descr         AS tipo_descr,
    d.nome_original,
    d.filename,
    d.tamanho,
    d.notas,
    d.uploaded_by,
    up.name         AS uploaded_by_nome,
    d.created_at
FROM tb_rh_documento d
JOIN ts_client c              ON c.pk = d.tb_user_fk
JOIN tt_rh_tipo_documento t   ON t.pk = d.tt_tipo_fk
LEFT JOIN ts_client up        ON up.pk = d.uploaded_by;

-- ═══════════════════════════════════════════════════════════════
-- 4. Verificação
-- ═══════════════════════════════════════════════════════════════

SELECT 'tb_rh_documento' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_rh_documento'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'vbl_rh_documento' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_name = 'vbl_rh_documento'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'tt_rh_tipo_documento (seed)' AS check_name,
    CASE WHEN (SELECT COUNT(*) FROM tt_rh_tipo_documento) >= 6
    THEN 'OK' ELSE 'FALHOU' END AS resultado;
