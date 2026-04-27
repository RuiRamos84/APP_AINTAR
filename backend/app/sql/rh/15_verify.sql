-- backend/app/sql/rh/15_verify.sql
-- Executar após toda a BD estar criada — verifica integridade do esquema

-- 1. Todas as tabelas existem (deve retornar 17)
SELECT
    CASE WHEN COUNT(*) = 17 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/17)' END AS tabelas_check,
    COUNT(*) AS total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tt_rh_tipo_jornada', 'tt_rh_ponto_evento', 'tt_rh_tipo_ferias',
    'tt_rh_tipo_falta', 'tt_rh_estado_workflow', 'tt_rh_piquete_ocorrencia',
    'ts_rh_config', 'ts_rh_horario', 'ts_feriados',
    'tb_rh_ponto', 'tb_rh_ponto_mensal', 'tb_rh_ferias',
    'tb_rh_faltas', 'tb_rh_workflow', 'tb_rh_piquete_escala',
    'tb_rh_piquete_ocorrencia', 'ts_rh_piquete_regras'
  );

-- 2. Todas as views existem (deve retornar 9)
SELECT
    CASE WHEN COUNT(*) = 9 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/9)' END AS views_check,
    COUNT(*) AS total
FROM information_schema.views
WHERE table_name LIKE 'vbl_rh_%';

-- 3. Todas as funções existem (deve retornar >= 12)
SELECT
    CASE WHEN COUNT(*) >= 12 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/12)' END AS funcoes_check,
    COUNT(*) AS total
FROM information_schema.routines
WHERE routine_name IN (
    'fn_rh_dias_uteis',
    'fbo_rh_ponto_evento', 'fbo_rh_ponto_submeter', 'fbo_rh_ponto_corrigir',
    'fbo_rh_workflow',
    'fbo_rh_ferias', 'fbo_rh_config_upsert',
    'fbo_rh_faltas',
    'fbo_rh_horario',
    'fbo_rh_piquete_generate', 'fbo_rh_piquete_confirmar', 'fbo_rh_ocorrencia'
);

-- 4. Seed data correcta
SELECT 'Feriados 2026' AS check_name,
    CASE WHEN COUNT(*) = 13 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/13)' END AS resultado
FROM ts_feriados WHERE EXTRACT(YEAR FROM data) = 2026;

SELECT 'Regras piquete' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM ts_rh_piquete_regras;

SELECT 'Lookups estado workflow' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_estado_workflow;

SELECT 'Lookups tipo jornada' AS check_name,
    CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/2)' END AS resultado
FROM tt_rh_tipo_jornada;

SELECT 'Lookups tipo falta' AS check_name,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/4)' END AS resultado
FROM tt_rh_tipo_falta;

-- 5. Função dias_uteis correcta
SELECT 'fn_rh_dias_uteis semana normal' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-04', '2026-05-08') = 5 THEN 'OK'
         ELSE 'FALHOU (esperado 5, obtido ' || fn_rh_dias_uteis('2026-05-04', '2026-05-08') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis com feriado' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-04-27', '2026-05-01') = 4 THEN 'OK'
         ELSE 'FALHOU (esperado 4, obtido ' || fn_rh_dias_uteis('2026-04-27', '2026-05-01') || ')' END AS resultado;

SELECT 'fn_rh_dias_uteis fim-de-semana' AS check_name,
    CASE WHEN fn_rh_dias_uteis('2026-05-09', '2026-05-10') = 0 THEN 'OK'
         ELSE 'FALHOU (esperado 0, obtido ' || fn_rh_dias_uteis('2026-05-09', '2026-05-10') || ')' END AS resultado;

-- 6. Smoke test: cada view executa sem erros
SELECT 'vbl_rh_colaborador'       AS view_name, COUNT(*) AS rows FROM vbl_rh_colaborador
UNION ALL
SELECT 'vbl_rh_ponto',             COUNT(*) FROM vbl_rh_ponto
UNION ALL
SELECT 'vbl_rh_ponto_mensal',      COUNT(*) FROM vbl_rh_ponto_mensal
UNION ALL
SELECT 'vbl_rh_ferias',            COUNT(*) FROM vbl_rh_ferias
UNION ALL
SELECT 'vbl_rh_saldo_ferias',      COUNT(*) FROM vbl_rh_saldo_ferias
UNION ALL
SELECT 'vbl_rh_faltas',            COUNT(*) FROM vbl_rh_faltas
UNION ALL
SELECT 'vbl_rh_horario',           COUNT(*) FROM vbl_rh_horario
UNION ALL
SELECT 'vbl_rh_piquete',           COUNT(*) FROM vbl_rh_piquete
UNION ALL
SELECT 'vbl_rh_piquete_ocorrencias', COUNT(*) FROM vbl_rh_piquete_ocorrencias;
