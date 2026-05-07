-- backend/app/sql/rh/19_vbl_lookups_config.sql
-- Views de leitura para tabelas de lookup do módulo RH e para ts_rh_config.
-- Idempotente: DROP ... CASCADE antes de cada CREATE VIEW

-- ─── Lookups ─────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS vbl_rh_tipo_jornada CASCADE;
CREATE VIEW vbl_rh_tipo_jornada AS
    SELECT pk, descr FROM tt_rh_tipo_jornada ORDER BY pk;

DROP VIEW IF EXISTS vbl_rh_ponto_evento CASCADE;
CREATE VIEW vbl_rh_ponto_evento AS
    SELECT pk, descr, ordem FROM tt_rh_ponto_evento ORDER BY ordem;

DROP VIEW IF EXISTS vbl_rh_tipo_ferias CASCADE;
CREATE VIEW vbl_rh_tipo_ferias AS
    SELECT pk, descr, debita_saldo FROM tt_rh_tipo_ferias ORDER BY pk;

DROP VIEW IF EXISTS vbl_rh_tipo_falta CASCADE;
CREATE VIEW vbl_rh_tipo_falta AS
    SELECT pk, descr, requer_justificativo FROM tt_rh_tipo_falta ORDER BY pk;

DROP VIEW IF EXISTS vbl_rh_estado_workflow CASCADE;
CREATE VIEW vbl_rh_estado_workflow AS
    SELECT pk, descr, cor FROM tt_rh_estado_workflow ORDER BY pk;

DROP VIEW IF EXISTS vbl_rh_tipo_ocorrencia CASCADE;
CREATE VIEW vbl_rh_tipo_ocorrencia AS
    SELECT pk, descr FROM tt_rh_piquete_ocorrencia ORDER BY pk;


-- ─── Config anual de saldo ────────────────────────────────────────────────────

DROP VIEW IF EXISTS vbl_rh_config CASCADE;
CREATE VIEW vbl_rh_config AS
SELECT
    cfg.pk,
    cfg.tb_user_fk,
    c.name          AS colaborador_nome,
    cfg.ano,
    cfg.dias_ferias_total,
    cfg.dias_ferias_gozados,
    cfg.notas
FROM ts_rh_config cfg
JOIN ts_client c ON c.pk = cfg.tb_user_fk;


-- ─── Verificação ─────────────────────────────────────────────────────────────
SELECT
    CASE WHEN COUNT(*) = 7 THEN 'OK' ELSE 'FALHOU (' || COUNT(*) || '/7)' END AS lookup_views_check,
    COUNT(*) AS total
FROM information_schema.views
WHERE table_name IN (
    'vbl_rh_tipo_jornada',
    'vbl_rh_ponto_evento',
    'vbl_rh_tipo_ferias',
    'vbl_rh_tipo_falta',
    'vbl_rh_estado_workflow',
    'vbl_rh_tipo_ocorrencia',
    'vbl_rh_config'
);
