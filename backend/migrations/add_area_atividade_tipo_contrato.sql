-- ============================================================
-- AINTAR — Migration: área de atividade e tipo de contrato
-- em tb_site_procedimento
-- ============================================================

SET search_path TO aintar_server_dev;

-- 1. Adicionar colunas
ALTER TABLE tb_site_procedimento
    ADD COLUMN IF NOT EXISTS area_atividade    VARCHAR(150),
    ADD COLUMN IF NOT EXISTS tt_tipo_contrato  SMALLINT
        REFERENCES ts_concursal_tipo_contrato(pk);

-- 2. Recriar view com os novos campos
CREATE OR REPLACE VIEW vbl_site_procedimento AS
SELECT
    p.pk,
    p.referencia,
    p.ts_tipo,
    t.name              AS tipo,
    p.titulo,
    p.carreira,
    p.categoria_prof,
    p.area_atividade,
    p.tt_tipo_contrato,
    tc.descricao        AS tipo_contrato,
    p.num_vagas,
    p.municipio,
    p.ts_estado,
    e.name              AS estado,
    p.descricao,
    p.data_abertura,
    p.data_encerramento,
    p.visivel,
    p.data_criacao,
    (SELECT COUNT(*)
     FROM tb_site_procedimento_fase f
     WHERE f.procedimento_fk = p.pk)                          AS num_fases,
    (SELECT MAX(f.data)
     FROM tb_site_procedimento_fase f
     WHERE f.procedimento_fk = p.pk AND f.publicado = TRUE)  AS ultima_fase_data,
    (SELECT tf.name
     FROM tb_site_procedimento_fase f
     JOIN ts_site_procedimento_fase_tipo tf ON tf.pk = f.ts_tipo_fase
     WHERE f.procedimento_fk = p.pk AND f.publicado = TRUE
     ORDER BY f.ordem DESC LIMIT 1)                           AS ultima_fase_nome
FROM tb_site_procedimento p
LEFT JOIN ts_site_procedimento_tipo    t  ON t.pk  = p.ts_tipo
LEFT JOIN ts_site_procedimento_estado  e  ON e.pk  = p.ts_estado
LEFT JOIN ts_concursal_tipo_contrato   tc ON tc.pk = p.tt_tipo_contrato;

-- 3. Recriar função com os dois novos parâmetros (no fim da lista)
CREATE OR REPLACE FUNCTION fbf_site_procedimento(
    pop                SMALLINT,
    pnpk               INTEGER,
    pnreferencia       VARCHAR,
    pnts_tipo          SMALLINT,
    pntitulo           VARCHAR,
    pncarreira         VARCHAR,
    pncategoria_prof   VARCHAR,
    pnnum_vagas        SMALLINT,
    pnmunicipio        VARCHAR,
    pnts_estado        SMALLINT,
    pndescricao        TEXT,
    pndata_abertura    DATE,
    pndata_enc         DATE,
    pnvisivel          BOOLEAN,
    pncriado_por       INTEGER,
    pnarea_atividade   VARCHAR  DEFAULT NULL,
    pntt_tipo_contrato SMALLINT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_procedimento (
            pk, referencia, ts_tipo, titulo, carreira, categoria_prof,
            num_vagas, municipio, ts_estado, descricao,
            data_abertura, data_encerramento, visivel, criado_por,
            area_atividade, tt_tipo_contrato
        ) VALUES (
            pnpk, pnreferencia, pnts_tipo, pntitulo, pncarreira, pncategoria_prof,
            pnnum_vagas, pnmunicipio, pnts_estado, pndescricao,
            pndata_abertura, pndata_enc, pnvisivel, pncriado_por,
            pnarea_atividade, pntt_tipo_contrato
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_procedimento SET
            referencia        = COALESCE(pnreferencia,       referencia),
            ts_tipo           = COALESCE(pnts_tipo,          ts_tipo),
            titulo            = COALESCE(pntitulo,           titulo),
            carreira          = COALESCE(pncarreira,         carreira),
            categoria_prof    = COALESCE(pncategoria_prof,   categoria_prof),
            num_vagas         = COALESCE(pnnum_vagas,        num_vagas),
            municipio         = COALESCE(pnmunicipio,        municipio),
            ts_estado         = COALESCE(pnts_estado,        ts_estado),
            descricao         = COALESCE(pndescricao,        descricao),
            data_abertura     = COALESCE(pndata_abertura,    data_abertura),
            data_encerramento = COALESCE(pndata_enc,         data_encerramento),
            visivel           = COALESCE(pnvisivel,          visivel),
            area_atividade    = pnarea_atividade,
            tt_tipo_contrato  = pntt_tipo_contrato
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;
