-- backend/app/sql/audit_log.sql
-- Trilho de auditoria persistente, transversal à aplicação (não específico
-- de nenhum módulo) — desbloqueia admin_service.py::get_activity_logs, que
-- desde sempre devolvia um stub vazio à espera desta tabela.
--
-- Padrão copiado de tb_notification/fbf_notification (notification_central.sql):
-- tabela de eventos com hist_client/hist_time (mesmo par usado em 74-81
-- outras tabelas do projecto), PK via fs_nextcode(), função fbf_* simples
-- (RETURNS integer, sem o protocolo de texto <sucess>/<error> — esse é só
-- para funções com validação de regras de negócio, não para um INSERT puro).

-- ─── 1. Tabela ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ts_audit_log (
    pk          INTEGER      NOT NULL DEFAULT fs_nextcode(),
    hist_client INTEGER      REFERENCES ts_client(pk),
    hist_time   TIMESTAMP    NOT NULL DEFAULT NOW(),
    action      VARCHAR(80)  NOT NULL,   -- granular, namespaced: 'rh.ponto.corrigir_terceiro'
    resource    VARCHAR(60)  NOT NULL,   -- 'ponto' | 'ferias' | 'participacao' | 'face_template' | ...
    resource_id INTEGER,
    meta        JSONB,
    ip          VARCHAR(45),
    CONSTRAINT pk_ts_audit_log PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource    ON ts_audit_log (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_hist_client ON ts_audit_log (hist_client);
CREATE INDEX IF NOT EXISTS idx_audit_log_hist_time   ON ts_audit_log (hist_time DESC);


-- ─── 2. Vista de leitura ────────────────────────────────────────────────────
-- Nomes de coluna alinhados de propósito com o que ActivityLogsPage.jsx (já
-- existente no frontend) espera por linha: timestamp, user_name, action,
-- resource, resource_id, ip, success — para não ser preciso tocar no frontend.

DROP VIEW IF EXISTS vbl_audit_log;

CREATE VIEW vbl_audit_log AS
SELECT
    a.pk,
    a.hist_time    AS timestamp,
    a.hist_client  AS user_id,
    c.name         AS user_name,
    a.action,
    a.resource,
    a.resource_id,
    a.meta,
    a.ip,
    TRUE           AS success
FROM ts_audit_log a
LEFT JOIN ts_client c ON c.pk = a.hist_client;


-- ─── 3. Função de escrita ───────────────────────────────────────────────────
-- hist_client é passado explicitamente pelo chamador (não fs_client() como em
-- fbf_notification) — o código RH já calcula caller_pk/requester_fk em Python
-- a partir do JWT; usar isso directamente evita qualquer subtileza entre a
-- identidade da sessão BD e o chamador real da acção.

CREATE OR REPLACE FUNCTION fbf_audit_log(
    p_hist_client INTEGER,
    p_action      VARCHAR,
    p_resource    VARCHAR,
    p_resource_id INTEGER DEFAULT NULL,
    p_meta        JSONB   DEFAULT NULL,
    p_ip          VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    v_pk := fs_nextcode();
    INSERT INTO ts_audit_log (pk, hist_client, action, resource, resource_id, meta, ip)
    VALUES (v_pk, p_hist_client, p_action, p_resource, p_resource_id, p_meta, p_ip);
    RETURN v_pk;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. Verificação ─────────────────────────────────────────────────────────

SELECT 'ts_audit_log' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'ts_audit_log'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado
UNION ALL
SELECT 'vbl_audit_log',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_name = 'vbl_audit_log'
    ) THEN 'OK' ELSE 'FALHOU' END
UNION ALL
SELECT 'fbf_audit_log',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fbf_audit_log'
    ) THEN 'OK' ELSE 'FALHOU' END;
