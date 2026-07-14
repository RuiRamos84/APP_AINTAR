-- backend/app/sql/rh/30_tipo_contrato_simplificado.sql
-- Simplifica tipo_contrato para 2 categorias fixas: 'Sem Termo' | 'Prestação de Serviços'.
-- Acrescenta data_fim_contrato (só relevante para 'Prestação de Serviços').
-- Executar DEPOIS de 29_fix_ponto_submeter_mes_fechado.sql
--
-- IMPORTANTE: fbo_rh_colaborador NÃO está na forma do ficheiro 17 — foi
-- redefinida em 26_ferias_equipas.sql (13 argumentos, sem 'departamento',
-- com 'pop' em vez de 'p_op'). Esta migração parte dessa base.

-- ═══════════════════════════════════════════════════════════════
-- 1. Normalizar dados existentes (antes de qualquer constraint)
-- ═══════════════════════════════════════════════════════════════

UPDATE ts_rh_colaborador SET tipo_contrato = 'Sem Termo' WHERE tipo_contrato = 'Efectivo';
UPDATE ts_rh_colaborador SET tipo_contrato = NULL WHERE tipo_contrato IS NOT NULL AND TRIM(tipo_contrato) = '';

-- ═══════════════════════════════════════════════════════════════
-- 2. Nova coluna
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE ts_rh_colaborador
    ADD COLUMN IF NOT EXISTS data_fim_contrato DATE;

-- ═══════════════════════════════════════════════════════════════
-- 3. Constraint — só depois dos dados estarem normalizados
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE ts_rh_colaborador
    DROP CONSTRAINT IF EXISTS chk_rh_col_tipo_contrato;
ALTER TABLE ts_rh_colaborador
    ADD CONSTRAINT chk_rh_col_tipo_contrato
    CHECK (tipo_contrato IS NULL OR tipo_contrato IN ('Sem Termo', 'Prestação de Serviços'));

-- ═══════════════════════════════════════════════════════════════
-- 4. fbo_rh_colaborador — recriar com data_fim_contrato (14º parâmetro)
--
--    A chamada Python (rh_service.py) é posicional na string SQL —
--    a assinatura tem de corresponder exactamente à ordem abaixo.
--    Proteções incluídas:
--    - NULLIF(p_tipo_contrato, '') — o frontend envia '' (não NULL)
--      quando o <Select> é limpo; sem isto o CHECK rebentava com 500.
--    - data_fim_contrato limpa automaticamente para 'Sem Termo' — o
--      upsert é COALESCE-based (nunca limpa nada por si só), mas mudar
--      de 'Prestação de Serviços' para 'Sem Termo' tem de esvaziar a data.
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS fbo_rh_colaborador(
    INTEGER, INTEGER, DATE, DATE, VARCHAR, VARCHAR, VARCHAR,
    INTEGER, INTEGER, BOOLEAN, TEXT, BOOLEAN, INTEGER
);

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
    p_tt_rh_equipa_fk   INTEGER     DEFAULT NULL,
    p_data_fim_contrato DATE        DEFAULT NULL
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
            tt_rh_equipa_fk, data_fim_contrato
        ) VALUES (
            p_pk,
            p_data_nascimento, p_data_admissao, p_categoria, NULLIF(p_tipo_contrato, ''),
            p_num_mecanografico, p_superior_fk,
            COALESCE(p_dias_ferias_base, 22),
            COALESCE(p_elegivel_piquete, TRUE),
            p_notas,
            COALESCE(p_gps_obrigatorio, TRUE),
            p_tt_rh_equipa_fk,
            CASE WHEN NULLIF(p_tipo_contrato, '') = 'Sem Termo' THEN NULL ELSE p_data_fim_contrato END
        );
    ELSE
        UPDATE ts_rh_colaborador SET
            data_nascimento   = COALESCE(p_data_nascimento,   data_nascimento),
            data_admissao     = COALESCE(p_data_admissao,     data_admissao),
            categoria         = COALESCE(p_categoria,         categoria),
            tipo_contrato     = COALESCE(NULLIF(p_tipo_contrato, ''), tipo_contrato),
            num_mecanografico = COALESCE(p_num_mecanografico, num_mecanografico),
            superior_fk       = COALESCE(p_superior_fk,       superior_fk),
            dias_ferias_base  = COALESCE(p_dias_ferias_base,  dias_ferias_base),
            elegivel_piquete  = COALESCE(p_elegivel_piquete,  elegivel_piquete),
            notas             = COALESCE(p_notas,             notas),
            gps_obrigatorio   = COALESCE(p_gps_obrigatorio,   gps_obrigatorio),
            tt_rh_equipa_fk   = COALESCE(p_tt_rh_equipa_fk,  tt_rh_equipa_fk),
            data_fim_contrato = CASE
                WHEN COALESCE(NULLIF(p_tipo_contrato, ''), tipo_contrato) = 'Sem Termo' THEN NULL
                ELSE COALESCE(p_data_fim_contrato, data_fim_contrato)
            END
        WHERE pk = p_pk;
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 5. vbl_rh_colaborador — acrescentar data_fim_contrato no fim
--    (cópia integral de 26_ferias_equipas.sql + a coluna nova)
-- ═══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS vbl_rh_colaborador CASCADE;
CREATE VIEW vbl_rh_colaborador AS
SELECT
    c.pk,
    c.name,
    e.email,
    c.ts_profile                          AS perfil,
    col.data_nascimento,
    col.data_admissao,
    col.categoria,
    col.tipo_contrato,
    col.num_mecanografico,
    col.superior_fk,
    sup.name                              AS superior_nome,
    col.elegivel_piquete,
    col.ts_rh_local_fk,
    l.nome                                AS local_predefinido_nome,
    col.notas                             AS notas_rh,
    col.dias_ferias_base,
    col.gps_obrigatorio,
    col.created_at,
    col.updated_at,
    col.tt_rh_equipa_fk,
    eq.codigo                             AS equipa_codigo,
    eq.nome                               AS equipa_nome,
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
    END                                   AS anos_antiguidade,
    col.data_fim_contrato
FROM ts_client c
LEFT JOIN ts_entity e          ON e.pk = c.ts_entity
LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
LEFT JOIN ts_client sup        ON sup.pk = col.superior_fk
LEFT JOIN ts_rh_local l        ON l.pk = col.ts_rh_local_fk
LEFT JOIN tt_rh_equipa eq      ON eq.pk = col.tt_rh_equipa_fk
LEFT JOIN ts_rh_config cfg     ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h      ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j ON j.pk = h.tt_jornada_fk
WHERE c.ts_profile IN (0, 1, 6)
  AND COALESCE(c.active, 1) = 1;

-- ═══════════════════════════════════════════════════════════════
-- 6. Verificação
-- ═══════════════════════════════════════════════════════════════

SELECT 'tipo_contrato normalizado' AS check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM ts_rh_colaborador
        WHERE tipo_contrato IS NOT NULL
          AND tipo_contrato NOT IN ('Sem Termo', 'Prestação de Serviços')
    ) THEN 'OK' ELSE 'FALHOU — valores fora das 2 categorias, reparar manualmente' END AS resultado;

SELECT 'vbl_rh_colaborador (data_fim_contrato)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vbl_rh_colaborador' AND column_name = 'data_fim_contrato'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
