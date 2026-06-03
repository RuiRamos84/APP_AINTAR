-- backend/app/sql/rh/25_gps_obrigatorio.sql
-- Controlo de GPS por colaborador — RH define, colaborador não altera
-- Executar APÓS 24_gestao_central.sql

-- ─── 1. Coluna na tabela ──────────────────────────────────────────────────────
ALTER TABLE ts_rh_colaborador
    ADD COLUMN IF NOT EXISTS gps_obrigatorio BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 2. Actualizar vbl_rh_colaborador (adicionar campo) ──────────────────────
DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;

CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    col.departamento,
    col.superior_fk,
    sup.name                              AS superior_nome,
    COALESCE(col.elegivel_piquete, TRUE)  AS elegivel_piquete,
    COALESCE(col.gps_obrigatorio, TRUE)   AS gps_obrigatorio,
    col.notas                             AS notas_rh,
    col.ts_rh_local_fk,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22)                               AS dias_ferias_total,
    COALESCE(cfg.dias_ferias_gozados, 0)  AS dias_ferias_gozados,
    COALESCE(cfg.dias_ferias_total,
        fn_rh_calcular_ferias_ano(c.pk, EXTRACT(YEAR FROM NOW())::INT),
        22) - COALESCE(cfg.dias_ferias_gozados, 0) AS dias_ferias_disponiveis,
    cfg.ano                               AS config_ano,
    h.pk                                  AS horario_pk,
    h.descr                               AS horario_descr,
    j.descr                               AS jornada_descr,
    j.pk                                  AS tt_jornada_fk,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    CASE WHEN col.data_admissao IS NOT NULL
         THEN DATE_PART('year', AGE(NOW(), col.data_admissao))::INTEGER
         ELSE NULL
    END                                   AS anos_antiguidade
FROM ts_client c
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
LEFT JOIN ts_rh_colaborador col
    ON col.pk = c.pk
LEFT JOIN ts_client sup
    ON sup.pk = col.superior_fk
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk;


-- ─── 3. Actualizar fbo_rh_colaborador (adicionar parâmetro) ──────────────────
CREATE OR REPLACE FUNCTION fbo_rh_colaborador(
    p_op                INTEGER,
    p_pk                INTEGER,
    p_data_nascimento   DATE        DEFAULT NULL,
    p_data_admissao     DATE        DEFAULT NULL,
    p_categoria         VARCHAR     DEFAULT NULL,
    p_tipo_contrato     VARCHAR     DEFAULT NULL,
    p_num_mecanografico VARCHAR     DEFAULT NULL,
    p_departamento      VARCHAR     DEFAULT NULL,
    p_superior_fk       INTEGER     DEFAULT NULL,
    p_dias_ferias_base  INTEGER     DEFAULT NULL,
    p_elegivel_piquete  BOOLEAN     DEFAULT NULL,
    p_notas             TEXT        DEFAULT NULL,
    p_gps_obrigatorio   BOOLEAN     DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ts_client WHERE pk = p_pk) THEN
        RETURN '<error>Utilizador não encontrado: ' || p_pk || '</error>';
    END IF;

    SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE pk = p_pk) INTO v_exists;

    IF p_op = 0 THEN
        IF v_exists THEN
            UPDATE ts_rh_colaborador SET
                data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
                data_admissao     = COALESCE(p_data_admissao,     data_admissao),
                categoria         = COALESCE(p_categoria,         categoria),
                tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
                num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
                departamento      = COALESCE(p_departamento,      departamento),
                superior_fk       = COALESCE(p_superior_fk,       superior_fk),
                dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
                elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
                gps_obrigatorio   = COALESCE(p_gps_obrigatorio,   gps_obrigatorio),
                notas             = COALESCE(p_notas,             notas)
            WHERE pk = p_pk;
        ELSE
            INSERT INTO ts_rh_colaborador (
                pk, data_nascimento, data_admissao, categoria, tipo_contrato,
                num_mecanografico, departamento, superior_fk,
                dias_ferias_base, elegivel_piquete, gps_obrigatorio, notas
            ) VALUES (
                p_pk, p_data_nascimento, p_data_admissao, p_categoria, p_tipo_contrato,
                p_num_mecanografico, p_departamento, p_superior_fk,
                COALESCE(p_dias_ferias_base, 22),
                COALESCE(p_elegivel_piquete, TRUE),
                COALESCE(p_gps_obrigatorio, TRUE),
                p_notas
            );
        END IF;

    ELSIF p_op = 1 THEN
        IF NOT v_exists THEN
            RETURN '<error>Perfil RH não encontrado para utilizador ' || p_pk || '</error>';
        END IF;
        UPDATE ts_rh_colaborador SET
            data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
            data_admissao     = COALESCE(p_data_admissao,     data_admissao),
            categoria         = COALESCE(p_categoria,         categoria),
            tipo_contrato     = COALESCE(p_tipo_contrato,     tipo_contrato),
            num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
            departamento      = COALESCE(p_departamento,      departamento),
            superior_fk       = COALESCE(p_superior_fk,       superior_fk),
            dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
            elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
            gps_obrigatorio   = COALESCE(p_gps_obrigatorio,   gps_obrigatorio),
            notas             = COALESCE(p_notas,             notas)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. Verificação ───────────────────────────────────────────────────────────
SELECT 'gps_obrigatorio' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ts_rh_colaborador' AND column_name = 'gps_obrigatorio'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
