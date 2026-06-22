-- backend/app/sql/rh/26_ferias_equipas.sql
-- Equipas operacionais para regras de conflito de férias
-- Executar uma vez na BD antes de usar o módulo de mapa de férias.

-- ─── 1. Tabela de equipas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tt_rh_equipa (
    pk              SERIAL       PRIMARY KEY,
    codigo          VARCHAR(50)  NOT NULL UNIQUE,
    nome            VARCHAR(150) NOT NULL,
    max_simultaneos SMALLINT     NOT NULL DEFAULT 1,
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ─── 2. Seeds — organograma AINTAR 2026 ──────────────────────────────────────
INSERT INTO tt_rh_equipa (codigo, nome, max_simultaneos) VALUES
    ('DPAS-AMBIENTE',            'Reporte e Qualidade (Ambiente)',     1),
    ('DPAS-PROJETOS',            'Obras e Candidaturas',               1),
    ('DPAS-FISCALIZACAO',        'Fiscalização e Cadastro',            1),
    ('DPAS-OPERACAO',            'Operação Externa',                   1),
    ('ADMINISTRACAO-ESTRATEGIA', 'Projetos Estratégicos',              1),
    ('ADMINISTRACAO-TI',         'Sistemas Informáticos',              1),
    ('ADMINISTRACAO-JURIDICO',   'Jurídico',                           1),
    ('DAGF-CONTABILIDADE',       'Contabilidade e Tesouraria',         1),
    ('DAGF-RH',                  'Recursos Humanos',                   1),
    ('DAGF-ATENDIMENTO',         'Atendimento ao Público',             1),
    ('DAGF-COMUNICACAO',         'Comunicação',                        1)
ON CONFLICT (codigo) DO NOTHING;

-- ─── 3. FK em ts_rh_colaborador ──────────────────────────────────────────────
ALTER TABLE ts_rh_colaborador
    ADD COLUMN IF NOT EXISTS tt_rh_equipa_fk INTEGER
        REFERENCES tt_rh_equipa(pk) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ts_rh_col_equipa ON ts_rh_colaborador (tt_rh_equipa_fk);

-- ─── 4. View de leitura ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vbl_rh_equipa AS
SELECT pk, codigo, nome, max_simultaneos, ativo
FROM tt_rh_equipa
ORDER BY codigo;

-- ─── 5. Actualizar vbl_rh_colaborador para expor equipa ──────────────────────
-- Recria a view da 14_views.sql adicionando os campos de equipa.
-- email vem de ts_entity (c.ts_entity), não de ts_client directamente.
-- DROP necessário porque CREATE OR REPLACE não pode alterar nomes/ordem de colunas.
DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;
CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    COALESCE(cfg.dias_ferias_total, 22)  AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_gozados,
    COALESCE(cfg.dias_ferias_total, 22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,
    cfg.ano                              AS config_ano,
    h.pk                                 AS horario_pk,
    h.descr                              AS horario_descr,
    j.descr                              AS jornada_descr,
    j.pk                                 AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    CASE WHEN col.data_admissao IS NOT NULL
         THEN DATE_PART('year', AGE(NOW(), col.data_admissao))::INTEGER
         ELSE NULL
    END                              AS anos_antiguidade,
    col.tt_rh_equipa_fk,
    eq.codigo  AS equipa_codigo,
    eq.nome    AS equipa_nome,
    col.superior_fk,
    sup.name   AS superior_nome,
    col.ts_rh_local_fk,
    col.dias_ferias_base,
    col.elegivel_piquete,
    col.gps_obrigatorio,
    col.notas  AS notas_rh,
    col.created_at,
    col.updated_at
FROM ts_client c
LEFT JOIN ts_entity e       ON e.pk = c.ts_entity
LEFT JOIN ts_rh_config cfg  ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h   ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j ON j.pk = h.tt_jornada_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
LEFT JOIN ts_client sup     ON sup.pk = col.superior_fk
LEFT JOIN tt_rh_equipa eq   ON eq.pk = col.tt_rh_equipa_fk;

-- ─── 6. Actualizar fbo_rh_colaborador para aceitar tt_rh_equipa_fk ───────────
-- (Substituição DROP→CREATE porque assinatura muda)
-- Remover todas as sobrecargas anteriores (assinaturas com e sem departamento)
DROP FUNCTION IF EXISTS fbo_rh_colaborador(INTEGER, INTEGER, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, BOOLEAN, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS fbo_rh_colaborador(INTEGER, INTEGER, DATE, DATE, VARCHAR, VARCHAR, VARCHAR, INTEGER, INTEGER, BOOLEAN, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION fbo_rh_colaborador(
    pop                 INTEGER,
    p_pk                INTEGER,
    p_data_nascimento   DATE        DEFAULT NULL,
    p_data_admissao     DATE        DEFAULT NULL,
    p_categoria         VARCHAR     DEFAULT NULL,
    p_tipo_contrato     VARCHAR     DEFAULT NULL,
    p_num_mecanografico VARCHAR     DEFAULT NULL,
    p_superior_fk       INTEGER     DEFAULT NULL,
    p_dias_ferias_base  INTEGER     DEFAULT NULL,
    p_elegivel_piquete  BOOLEAN     DEFAULT NULL,
    p_notas             TEXT        DEFAULT NULL,
    p_gps_obrigatorio   BOOLEAN     DEFAULT NULL,
    p_tt_rh_equipa_fk   INTEGER     DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE pk = p_pk) INTO v_exists;

    IF NOT v_exists THEN
        INSERT INTO ts_rh_colaborador (
            pk, data_nascimento, data_admissao, categoria, tipo_contrato,
            num_mecanografico, superior_fk,
            dias_ferias_base, elegivel_piquete, notas, gps_obrigatorio,
            tt_rh_equipa_fk
        ) VALUES (
            p_pk,
            p_data_nascimento, p_data_admissao, p_categoria, p_tipo_contrato,
            p_num_mecanografico, p_superior_fk,
            COALESCE(p_dias_ferias_base, 22),
            COALESCE(p_elegivel_piquete, TRUE),
            p_notas,
            COALESCE(p_gps_obrigatorio, TRUE),
            p_tt_rh_equipa_fk
        );
    ELSE
        UPDATE ts_rh_colaborador SET
            data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
            data_admissao     = COALESCE(p_data_admissao,     data_admissao),
            categoria         = COALESCE(p_categoria,         categoria),
            tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
            num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
            superior_fk       = COALESCE(p_superior_fk,       superior_fk),
            dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
            elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
            notas             = COALESCE(p_notas,             notas),
            gps_obrigatorio   = COALESCE(p_gps_obrigatorio,   gps_obrigatorio),
            tt_rh_equipa_fk   = COALESCE(p_tt_rh_equipa_fk,  tt_rh_equipa_fk)
        WHERE pk = p_pk;
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;

-- ─── 7. Função de verificação de conflitos ────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_rh_ferias_conflitos(
    p_user_fk    INTEGER,
    p_inicio     DATE,
    p_fim        DATE,
    p_excluir_pk INTEGER DEFAULT NULL
)
RETURNS TABLE (
    ferias_pk        INTEGER,
    colaborador_nome TEXT,
    data_inicio      DATE,
    data_fim         DATE,
    estado           TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.pk::INTEGER,
        c.name::TEXT,
        f.data_inicio::DATE,
        f.data_fim::DATE,
        es.descr::TEXT
    FROM tb_rh_ferias f
    JOIN ts_rh_colaborador col_ferias ON col_ferias.pk = f.tb_user_fk
    JOIN ts_rh_colaborador col_pedido ON col_pedido.pk = p_user_fk
    JOIN ts_client c ON c.pk = f.tb_user_fk
    JOIN tt_rh_estado_workflow es ON es.pk = f.ts_estado_fk
    WHERE col_ferias.tt_rh_equipa_fk = col_pedido.tt_rh_equipa_fk
      AND col_ferias.tt_rh_equipa_fk IS NOT NULL
      AND f.tb_user_fk <> p_user_fk
      AND f.ts_estado_fk IN (2, 3, 5, 6)   -- validado, aprovado, autorizado, despachado
      AND f.data_inicio <= p_fim
      AND f.data_fim    >= p_inicio
      AND (p_excluir_pk IS NULL OR f.pk <> p_excluir_pk);
END;
$$ LANGUAGE plpgsql;

-- ─── 8. View para o mapa de férias ───────────────────────────────────────────
CREATE OR REPLACE VIEW vbl_rh_ferias_mapa AS
SELECT
    f.pk,
    f.tb_user_fk   AS user_fk,
    c.name         AS colaborador_nome,
    col.tt_rh_equipa_fk,
    eq.codigo      AS equipa_codigo,
    eq.nome        AS equipa_nome,
    f.data_inicio,
    f.data_fim,
    f.ts_estado_fk,
    es.descr       AS estado_descr,
    es.cor         AS estado_cor,
    EXTRACT(YEAR FROM f.data_inicio)::INTEGER AS ano
FROM tb_rh_ferias f
JOIN ts_client c ON c.pk = f.tb_user_fk
JOIN ts_rh_colaborador col ON col.pk = f.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = f.ts_estado_fk
LEFT JOIN tt_rh_equipa eq ON eq.pk = col.tt_rh_equipa_fk
WHERE f.ts_estado_fk NOT IN (4, 7);   -- exclui rejeitados
