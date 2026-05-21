-- Migration: módulo Orçamento
-- Tabelas: ts_orcamento_tipo, ts_orcamento_classe, ts_orcamento_subclasse,
--          ts_orcamento_subclasse_tipo, tb_orcamento
-- Vistas:  vbl_orcamento_detalhe, vbl_orcamento_subclasse, vbl_orcamento_classe
-- Seed:    ts_orcamento_tipo (Corrente, Capital)

-- ── Lookup: Tipo ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_orcamento_tipo (
    pk          SERIAL PRIMARY KEY,
    designacao  VARCHAR(200) NOT NULL
);

-- ── Lookup: Classe ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_orcamento_classe (
    pk          SERIAL PRIMARY KEY,
    designacao  VARCHAR(200) NOT NULL
);

-- ── Lookup: Subclasse ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_orcamento_subclasse (
    pk                  SERIAL PRIMARY KEY,
    designacao          VARCHAR(200) NOT NULL,
    ts_orcamento_classe INTEGER NOT NULL REFERENCES ts_orcamento_classe(pk),
    sncap               VARCHAR(30),
    memo                TEXT
);

-- ── Junction: Subclasse × Tipo ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_orcamento_subclasse_tipo (
    ts_orcamento_subclasse  INTEGER NOT NULL REFERENCES ts_orcamento_subclasse(pk) ON DELETE CASCADE,
    ts_orcamento_tipo       INTEGER NOT NULL REFERENCES ts_orcamento_tipo(pk),
    PRIMARY KEY (ts_orcamento_subclasse, ts_orcamento_tipo)
);

-- ── Principal: Orçamento ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tb_orcamento (
    pk                      SERIAL PRIMARY KEY,
    ano                     INTEGER       NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
    ts_orcamento_subclasse  INTEGER       NOT NULL REFERENCES ts_orcamento_subclasse(pk),
    valor                   NUMERIC(15,2) NOT NULL DEFAULT 0,
    data_inicio             DATE,
    data_fim                DATE,
    CONSTRAINT chk_orcamento_datas CHECK (
        data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio
    )
);

CREATE INDEX IF NOT EXISTS idx_tb_orcamento_ano        ON tb_orcamento(ano);
CREATE INDEX IF NOT EXISTS idx_tb_orcamento_subclasse  ON tb_orcamento(ts_orcamento_subclasse);

-- ── Vista: Detalhe por registo ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vbl_orcamento_detalhe AS
SELECT
    o.pk,
    o.ano,
    o.ts_orcamento_subclasse,
    c.designacao  AS classe,
    s.designacao  AS subclasse,
    COALESCE((
        SELECT string_agg(t.designacao, ', ' ORDER BY t.pk)
        FROM   ts_orcamento_subclasse_tipo st
        JOIN   ts_orcamento_tipo t ON t.pk = st.ts_orcamento_tipo
        WHERE  st.ts_orcamento_subclasse = s.pk
    ), '') AS tipo,
    s.sncap,
    s.memo,
    o.valor,
    o.data_inicio,
    o.data_fim
FROM  tb_orcamento           o
JOIN  ts_orcamento_subclasse s ON s.pk = o.ts_orcamento_subclasse
JOIN  ts_orcamento_classe    c ON c.pk = s.ts_orcamento_classe;

-- ── Vista: Subclasses com tipos agregados ──────────────────────────────────
CREATE OR REPLACE VIEW vbl_orcamento_subclasse AS
SELECT
    s.pk,
    s.designacao,
    c.pk          AS classe_pk,
    c.designacao  AS classe,
    s.sncap,
    s.memo,
    COALESCE(
        string_agg(t.designacao, ', ' ORDER BY t.pk), ''
    ) AS tipo,
    COALESCE(
        array_agg(st.ts_orcamento_tipo ORDER BY t.pk)
            FILTER (WHERE st.ts_orcamento_tipo IS NOT NULL),
        ARRAY[]::integer[]
    ) AS tipo_pks
FROM  ts_orcamento_subclasse          s
JOIN  ts_orcamento_classe             c  ON c.pk = s.ts_orcamento_classe
LEFT JOIN ts_orcamento_subclasse_tipo st ON st.ts_orcamento_subclasse = s.pk
LEFT JOIN ts_orcamento_tipo           t  ON t.pk = st.ts_orcamento_tipo
GROUP BY s.pk, s.designacao, c.pk, c.designacao, s.sncap, s.memo;

-- ── Vista: Resumo por classe e ano ─────────────────────────────────────────
CREATE OR REPLACE VIEW vbl_orcamento_classe AS
SELECT
    o.ano,
    c.pk          AS classe_pk,
    c.designacao  AS classe,
    SUM(o.valor)  AS total
FROM  tb_orcamento           o
JOIN  ts_orcamento_subclasse s ON s.pk = o.ts_orcamento_subclasse
JOIN  ts_orcamento_classe    c ON c.pk = s.ts_orcamento_classe
GROUP BY o.ano, c.pk, c.designacao;

-- ── Seed: Tipos iniciais ───────────────────────────────────────────────────
INSERT INTO ts_orcamento_tipo (designacao)
VALUES ('Corrente'), ('Capital')
ON CONFLICT DO NOTHING;
