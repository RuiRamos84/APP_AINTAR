-- Delta migration: schema final do módulo de orçamento
-- Idempotente: IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE

-- ── 1. Eliminar views dependentes (necessário antes de DROP COLUMN) ───────
DROP VIEW IF EXISTS vbl_orcamento02;
DROP VIEW IF EXISTS vbl_orcamento CASCADE;
DROP VIEW IF EXISTS "vbl_orcamento$subclasse";
DROP VIEW IF EXISTS "vbl_orcamento$classe";
DROP VIEW IF EXISTS vbf_orcamento;

-- ── 2. Remover colunas que deixaram de ser necessárias ────────────────────
ALTER TABLE "tt_orcamento$subclasse"
    DROP COLUMN IF EXISTS tipo;

ALTER TABLE tb_orcamento
    DROP COLUMN IF EXISTS data_inicio;

ALTER TABLE tb_orcamento
    DROP COLUMN IF EXISTS data_fim;

-- ── 3. vbl_orcamento$classe ───────────────────────────────────────────────
CREATE VIEW "vbl_orcamento$classe" AS
SELECT
    pk,
    name   AS designacao,
    memo,
    ord
FROM "tt_orcamento$classe"
ORDER BY ord;

-- ── 4. vbl_orcamento$subclasse ────────────────────────────────────────────
CREATE VIEW "vbl_orcamento$subclasse" AS
SELECT
    b.pk,
    c.name   AS classe,
    c.pk     AS classe_pk,
    b.name   AS designacao,
    s.pk     AS sncap,
    b.memo,
    b.ord
FROM  "tt_orcamento$subclasse"  b
JOIN  "tt_orcamento$classe"     c ON c.pk = b."tt_orcamento$classe"
JOIN  "tt_orcamento$sncap"      s ON s.pk = b."tt_orcamento$sncap";

-- ── 5. vbl_orcamento ──────────────────────────────────────────────────────
CREATE VIEW vbl_orcamento AS
SELECT
    b.pk,
    b.ano,
    b."tt_orcamento$subclasse"  AS ts_orcamento_subclasse,
    c.name                      AS classe,
    a.name                      AS subclasse,
    s.pk                        AS sncap,
    b.valor,
    b.name,
    b.memo
FROM  tb_orcamento             b
JOIN  "tt_orcamento$subclasse" a ON a.pk = b."tt_orcamento$subclasse"
JOIN  "tt_orcamento$classe"    c ON c.pk = a."tt_orcamento$classe"
JOIN  "tt_orcamento$sncap"     s ON s.pk = a."tt_orcamento$sncap"
ORDER BY c.ord, a.ord;

-- ── 5b. vbl_orcamento02 ───────────────────────────────────────────────────
CREATE VIEW vbl_orcamento02 AS
WITH niveis AS (
    SELECT sncap, valor,
           string_to_array(sncap, '.') AS partes
    FROM vbl_orcamento
), explodido AS (
    SELECT sncap, valor,
           array_to_string(partes[1:1], '.') AS codigo, 1 AS level
    FROM niveis
    UNION ALL
    SELECT sncap, valor,
           array_to_string(partes[1:2], '.') AS codigo, 2 AS level
    FROM niveis WHERE array_length(partes, 1) >= 2
    UNION ALL
    SELECT sncap, valor,
           array_to_string(partes[1:3], '.') AS codigo, 3 AS level
    FROM niveis WHERE array_length(partes, 1) >= 3
    UNION ALL
    SELECT sncap, valor,
           array_to_string(partes[1:4], '.') AS codigo, 4 AS level
    FROM niveis WHERE array_length(partes, 1) >= 4
)
SELECT e.level, e.codigo, c.name, SUM(e.valor) AS total
FROM explodido e
LEFT JOIN "tt_orcamento$sncap" c ON c.pk = e.codigo
GROUP BY e.level, e.codigo, c.name
ORDER BY e.codigo;

-- ── 6. vbf_orcamento ──────────────────────────────────────────────────────
CREATE VIEW vbf_orcamento AS
SELECT
    pk,
    ano,
    "tt_orcamento$subclasse",
    name,
    valor,
    memo
FROM tb_orcamento;

-- ── 7. vbl_orcamento$classe_totais ───────────────────────────────────────
CREATE OR REPLACE VIEW "vbl_orcamento$classe_totais" AS
SELECT
    b.ano,
    c.pk            AS classe_pk,
    c.name          AS classe,
    SUM(b.valor)    AS total
FROM  tb_orcamento             b
JOIN  "tt_orcamento$subclasse" a ON a.pk = b."tt_orcamento$subclasse"
JOIN  "tt_orcamento$classe"    c ON c.pk = a."tt_orcamento$classe"
GROUP BY b.ano, c.pk, c.name;
