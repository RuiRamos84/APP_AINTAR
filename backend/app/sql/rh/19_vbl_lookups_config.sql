-- backend/app/sql/rh/19_vbl_lookups_config.sql
--
-- Views de leitura para tabelas de lookup do módulo RH e para ts_rh_config.
-- Seguindo o padrão da aplicação: todas as interacções fazem-se por views (vbl_)
-- e funções (fbo_ / fn_), nunca directamente nas tabelas base.
--
-- Executar após 18_filtro_perfis_rh.sql

-- ─── Lookups ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vbl_rh_tipo_jornada AS
    SELECT pk, descr
    FROM tt_rh_tipo_jornada
    ORDER BY pk;


CREATE OR REPLACE VIEW vbl_rh_ponto_evento AS
    SELECT pk, descr, ordem
    FROM tt_rh_ponto_evento
    ORDER BY ordem;


CREATE OR REPLACE VIEW vbl_rh_tipo_ferias AS
    SELECT pk, descr, debita_saldo
    FROM tt_rh_tipo_ferias
    ORDER BY pk;


CREATE OR REPLACE VIEW vbl_rh_tipo_falta AS
    SELECT pk, descr, requer_justificativo
    FROM tt_rh_tipo_falta
    ORDER BY pk;


CREATE OR REPLACE VIEW vbl_rh_estado_workflow AS
    SELECT pk, descr, cor
    FROM tt_rh_estado_workflow
    ORDER BY pk;


-- Nota: usa o nome da tabela (tt_rh_piquete_ocorrencia) mas expõe com alias coerente
CREATE OR REPLACE VIEW vbl_rh_tipo_ocorrencia AS
    SELECT pk, descr
    FROM tt_rh_piquete_ocorrencia
    ORDER BY pk;


-- ─── Config anual de saldo ────────────────────────────────────────────────────

CREATE OR REPLACE VIEW vbl_rh_config AS
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
