-- Tabela central de notificações (feed unificado por-utilizador).
-- Usada hoje por Operação e RH; tasks/documents migram nas fases seguintes
-- do plano de unificação (ver C:\Users\rui.ramos\.claude\plans\deep-dancing-mochi.md).
--
-- Extraído da BD viva (aintar_server_dev) em 2026-06-26 — objetos já existiam
-- em dev e prod antes deste ficheiro existir; isto apenas versiona a DDL.

CREATE TABLE IF NOT EXISTS tb_notification (
    pk integer PRIMARY KEY,
    ts_client integer NOT NULL,
    type text NOT NULL,
    notification_type text,
    title text NOT NULL,
    message text,
    route text,
    metadata jsonb,
    read integer NOT NULL DEFAULT 0,
    hist_client integer,
    hist_time timestamp NOT NULL DEFAULT current_timestamp
);

CREATE INDEX IF NOT EXISTS ix_tb_notification_client_unread
    ON tb_notification (ts_client, read);

-- Serve o feed (WHERE ts_client = fs_client() ORDER BY hist_time DESC LIMIT n);
-- o índice acima só serve a contagem de não-lidas. (2026-07-17)
CREATE INDEX IF NOT EXISTS ix_tb_notification_client_time
    ON tb_notification (ts_client, hist_time DESC);

-- Leitura: cada utilizador só vê as suas próprias notificações.
CREATE OR REPLACE VIEW vbl_notification AS
SELECT pk, type, notification_type, title, message, route, metadata, read, hist_time
FROM tb_notification
WHERE ts_client = fs_client()
ORDER BY hist_time DESC;

-- Escrita: criação/eliminação de notificações (pop 0=INSERT, 2=DELETE).
CREATE OR REPLACE FUNCTION fbf_notification(
    pop integer, pnpk integer, pnts_client integer, pntype text,
    pnnotification_type text, pntitle text, pnmessage text,
    pnroute text, pnmetadata jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
begin
    if (pop = 0) then
        insert into tb_notification (pk, ts_client, type, notification_type, title, message, route, metadata, read, hist_client, hist_time)
        values (pnpk, pnts_client, pntype, pnnotification_type, pntitle, pnmessage, pnroute, pnmetadata, 0, COALESCE(fs_client(),0), current_timestamp);
        return pnpk;
    end if;

    if (pop = 2) then
        delete from tb_notification where pk = pnpk;
        return pnpk;
    end if;

    return pnpk;
end; $function$;

-- Marcar uma notificação como lida (apenas a do próprio utilizador).
CREATE OR REPLACE FUNCTION "fbf_notification$read"(pnpk integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
begin
    update tb_notification set read = 1 where pk = pnpk and ts_client = COALESCE(fs_client(),0);
    return pnpk;
end; $function$;

-- Marcar todas as notificações do utilizador atual como lidas.
CREATE OR REPLACE FUNCTION "fbf_notification$readall"()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
declare
    c integer;
begin
    update tb_notification set read = 1 where ts_client = COALESCE(fs_client(),0) and read = 0;
    get diagnostics c = row_count;
    return c;
end; $function$;

-- Purga diária (job em backend/app/scheduler.py, 04:00):
--   lidas > 90 dias; não-lidas > 180 dias (2026-07-17 — sem este segundo
--   critério, utilizadores inativos acumulavam não-lidas para sempre).
CREATE OR REPLACE FUNCTION "fbf_notification$purge"()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
declare
    c integer;
begin
    delete from tb_notification
    where (read = 1 and hist_time < current_timestamp - interval '90 days')
       or (read = 0 and hist_time < current_timestamp - interval '180 days');
    get diagnostics c = row_count;
    return c;
end; $function$;