-- Migration: suporte a múltiplos tipos por subclasse orçamental
-- Executar uma única vez no PostgreSQL

-- 1. Junction table
CREATE TABLE IF NOT EXISTS ts_orcamento_subclasse_tipo (
    ts_orcamento_subclasse INTEGER NOT NULL
        REFERENCES ts_orcamento_subclasse(pk) ON DELETE CASCADE,
    ts_orcamento_tipo      INTEGER NOT NULL
        REFERENCES ts_orcamento_tipo(pk),
    PRIMARY KEY (ts_orcamento_subclasse, ts_orcamento_tipo)
);

-- 2. Migrar dados existentes (coluna antiga ts_orcamento_tipo)
INSERT INTO ts_orcamento_subclasse_tipo (ts_orcamento_subclasse, ts_orcamento_tipo)
SELECT pk, ts_orcamento_tipo
FROM   ts_orcamento_subclasse
WHERE  ts_orcamento_tipo IS NOT NULL
ON CONFLICT DO NOTHING;
