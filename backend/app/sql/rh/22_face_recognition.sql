-- backend/app/sql/rh/22_face_recognition.sql
-- Reconhecimento facial para registo de ponto
-- Executar APÓS 21_geofencing.sql

-- ─── 1. Tabela de templates faciais ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tb_rh_face_template (
    pk          INTEGER       NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk  INTEGER       NOT NULL REFERENCES ts_client(pk) ON DELETE CASCADE,
    descriptor  FLOAT8[]      NOT NULL,   -- vector 128-D (face-api.js)
    criado_em   TIMESTAMP     NOT NULL DEFAULT NOW(),
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_tb_rh_face_template PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_rh_face_user ON tb_rh_face_template (tb_user_fk) WHERE ativo = TRUE;


-- ─── 2. Extensão de tb_rh_ponto ───────────────────────────────────────────────

ALTER TABLE tb_rh_ponto
    ADD COLUMN IF NOT EXISTS face_verified BOOLEAN  DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS face_score    FLOAT8;


-- ─── 3. Vista actualizada (inclui face_verified / face_score) ────────────────
-- DROP ... CASCADE é necessário porque CREATE OR REPLACE não aceita reordenação
-- de colunas nem adição no meio da lista.

DROP VIEW IF EXISTS vbl_rh_ponto CASCADE;

CREATE VIEW vbl_rh_ponto AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                                                      AS colaborador_nome,
    p.data,
    p.tt_evento_fk,
    e.descr                                                     AS evento_descr,
    e.ordem                                                     AS evento_ordem,
    p.ts_registo,
    p.latitude,
    p.longitude,
    p.precisao_metros,
    p.fonte,
    p.notas,
    p.fora_local,
    p.distancia_metros,
    l.nome                                                      AS local_nome,
    CASE WHEN p.latitude IS NOT NULL THEN TRUE ELSE FALSE END   AS tem_gps,
    p.face_verified,
    p.face_score
FROM tb_rh_ponto p
JOIN ts_client           c   ON c.pk  = p.tb_user_fk
JOIN tt_rh_ponto_evento  e   ON e.pk  = p.tt_evento_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = p.tb_user_fk
LEFT JOIN ts_rh_local       l   ON l.pk   = col.ts_rh_local_fk;
