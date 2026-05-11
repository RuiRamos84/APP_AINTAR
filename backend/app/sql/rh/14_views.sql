-- backend/app/sql/rh/14_views.sql
-- Idempotente: DROP ... CASCADE antes de cada CREATE VIEW

DROP VIEW IF EXISTS vbl_rh_colaborador         CASCADE;
DROP VIEW IF EXISTS vbl_rh_ponto               CASCADE;
DROP VIEW IF EXISTS vbl_rh_ponto_mensal        CASCADE;
DROP VIEW IF EXISTS vbl_rh_ferias              CASCADE;
DROP VIEW IF EXISTS vbl_rh_saldo_ferias        CASCADE;
DROP VIEW IF EXISTS vbl_rh_faltas              CASCADE;
DROP VIEW IF EXISTS vbl_rh_horario             CASCADE;
DROP VIEW IF EXISTS vbl_rh_piquete             CASCADE;
DROP VIEW IF EXISTS vbl_rh_piquete_ocorrencias CASCADE;


-- Vista de colaboradores com saldo e horário activo
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
    h.hora_fim_almoco
FROM ts_client c
LEFT JOIN ts_entity e
    ON e.pk = c.ts_entity
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT
LEFT JOIN ts_rh_horario h
    ON h.tb_user_fk = c.pk AND h.data_fim IS NULL
LEFT JOIN tt_rh_tipo_jornada j
    ON j.pk = h.tt_jornada_fk;


-- Vista de registos de ponto
CREATE VIEW vbl_rh_ponto AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                          AS colaborador_nome,
    p.data,
    p.tt_evento_fk,
    e.descr                         AS evento_descr,
    e.ordem                         AS evento_ordem,
    p.ts_registo,
    p.latitude,
    p.longitude,
    p.precisao_metros,
    p.fonte,
    p.notas,
    p.fora_local,
    p.distancia_metros,
    l.nome                          AS local_nome,
    CASE WHEN p.latitude IS NOT NULL THEN TRUE ELSE FALSE END AS tem_gps
FROM tb_rh_ponto p
JOIN ts_client c          ON c.pk = p.tb_user_fk
JOIN tt_rh_ponto_evento e ON e.pk = p.tt_evento_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = p.tb_user_fk
LEFT JOIN ts_rh_local l         ON l.pk = col.ts_rh_local_fk;


-- Vista de mapas mensais
CREATE VIEW vbl_rh_ponto_mensal AS
SELECT
    m.pk,
    m.tb_user_fk,
    c.name                          AS colaborador_nome,
    m.ano,
    m.mes,
    m.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    m.total_horas,
    m.total_dias,
    m.submetido_em,
    m.notas_colaborador
FROM tb_rh_ponto_mensal m
JOIN ts_client c              ON c.pk = m.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = m.ts_estado_fk;


-- Vista de pedidos de férias
CREATE VIEW vbl_rh_ferias AS
SELECT
    f.pk,
    f.tb_user_fk,
    c.name                          AS colaborador_nome,
    f.tt_tipo_fk,
    t.descr                         AS tipo_descr,
    t.debita_saldo,
    f.data_inicio,
    f.data_fim,
    f.dias_uteis,
    f.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    f.notas,
    f.created_at
FROM tb_rh_ferias f
JOIN ts_client c              ON c.pk = f.tb_user_fk
JOIN tt_rh_tipo_ferias t      ON t.pk = f.tt_tipo_fk
JOIN tt_rh_estado_workflow es ON es.pk = f.ts_estado_fk;


-- Vista de saldo de férias
CREATE VIEW vbl_rh_saldo_ferias AS
SELECT
    c.pk                            AS tb_user_fk,
    c.name                          AS colaborador_nome,
    EXTRACT(YEAR FROM NOW())::INT   AS ano,
    COALESCE(cfg.dias_ferias_total, 22)  AS dias_total,
    COALESCE(cfg.dias_ferias_gozados, 0) AS dias_gozados,
    COALESCE((
        SELECT SUM(dias_uteis) FROM tb_rh_ferias
        WHERE tb_user_fk = c.pk
          AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
          AND ts_estado_fk IN (1, 2)
          AND tt_tipo_fk = 1
    ), 0)                           AS dias_pendentes,
    COALESCE(cfg.dias_ferias_total, 22)
        - COALESCE(cfg.dias_ferias_gozados, 0)
        - COALESCE((
            SELECT SUM(dias_uteis) FROM tb_rh_ferias
            WHERE tb_user_fk = c.pk
              AND EXTRACT(YEAR FROM data_inicio) = EXTRACT(YEAR FROM NOW())::INT
              AND ts_estado_fk IN (1, 2) AND tt_tipo_fk = 1
          ), 0)                     AS dias_disponiveis
FROM ts_client c
LEFT JOIN ts_rh_config cfg
    ON cfg.tb_user_fk = c.pk AND cfg.ano = EXTRACT(YEAR FROM NOW())::INT;


-- Vista de faltas
CREATE VIEW vbl_rh_faltas AS
SELECT
    fa.pk,
    fa.tb_user_fk,
    c.name                          AS colaborador_nome,
    fa.tt_tipo_falta_fk,
    t.descr                         AS tipo_descr,
    t.requer_justificativo,
    fa.data,
    fa.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    fa.justificativo_path,
    fa.comunicado_por,
    CASE WHEN fa.comunicado_por IS NOT NULL THEN cp.name ELSE NULL END AS comunicado_por_nome,
    fa.notas,
    fa.created_at
FROM tb_rh_faltas fa
JOIN ts_client c              ON c.pk = fa.tb_user_fk
JOIN tt_rh_tipo_falta t       ON t.pk = fa.tt_tipo_falta_fk
JOIN tt_rh_estado_workflow es ON es.pk = fa.ts_estado_fk
LEFT JOIN ts_client cp        ON cp.pk = fa.comunicado_por;


-- Vista de horários
CREATE VIEW vbl_rh_horario AS
SELECT
    h.pk,
    h.tb_user_fk,
    c.name                          AS colaborador_nome,
    h.tt_jornada_fk,
    j.descr                         AS jornada_descr,
    h.descr,
    h.hora_entrada,
    h.hora_saida,
    h.hora_inicio_almoco,
    h.hora_fim_almoco,
    h.dias_semana,
    h.data_inicio,
    h.data_fim,
    CASE WHEN h.data_fim IS NULL THEN TRUE ELSE FALSE END AS activo
FROM ts_rh_horario h
JOIN ts_client c            ON c.pk = h.tb_user_fk
JOIN tt_rh_tipo_jornada j   ON j.pk = h.tt_jornada_fk;


-- Vista de escala de piquete
CREATE VIEW vbl_rh_piquete AS
SELECT
    e.pk,
    e.tb_user_fk,
    c.name                          AS colaborador_nome,
    e.data_inicio,
    e.data_fim,
    e.confirmado,
    e.ts_confirmacao,
    e.ts_estado_fk,
    es.descr                        AS estado_descr,
    es.cor                          AS estado_cor,
    e.gerado_auto,
    e.created_at,
    EXTRACT(YEAR FROM e.data_inicio)::INT  AS ano,
    EXTRACT(MONTH FROM e.data_inicio)::INT AS mes
FROM tb_rh_piquete_escala e
JOIN ts_client c              ON c.pk = e.tb_user_fk
JOIN tt_rh_estado_workflow es ON es.pk = e.ts_estado_fk;


-- Vista de ocorrências de piquete
CREATE VIEW vbl_rh_piquete_ocorrencias AS
SELECT
    o.pk,
    o.tb_piquete_escala_fk,
    e.tb_user_fk,
    e.data_inicio                   AS semana_inicio,
    e.data_fim                      AS semana_fim,
    c.name                          AS colaborador_nome,
    o.tt_tipo_fk,
    t.descr                         AS tipo_descr,
    o.descr,
    o.equipas_accionadas,
    o.evidencia_path,
    o.created_by,
    cb.name                         AS created_by_nome,
    o.created_at
FROM tb_rh_piquete_ocorrencia o
JOIN tb_rh_piquete_escala e       ON e.pk = o.tb_piquete_escala_fk
JOIN ts_client c                  ON c.pk = e.tb_user_fk
JOIN tt_rh_piquete_ocorrencia t   ON t.pk = o.tt_tipo_fk
LEFT JOIN ts_client cb            ON cb.pk = o.created_by;
