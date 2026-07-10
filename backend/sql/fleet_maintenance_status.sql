-- ============================================================================
-- Frota — Estado de Manutenções/Avarias + visibilidade de quem reportou
-- ============================================================================
-- Dá ao "responsável" (qualquer utilizador com fleet.edit, ou admin ts_profile=0)
-- uma forma de ver e gerir avarias reportadas via "A Minha Viatura":
--   1. Novo lookup ts_maintenancestatus (1=Reportada, 2=Em resolução, 3=Resolvida)
--   2. tb_vehicle_maintenance ganha a coluna ts_maintenancestatus (default 3 —
--      uma intervenção lançada diretamente pelo gestor já está concluída)
--   3. Backfill: avarias (tt_maintenancetype=3 'Reparação') sem custo lançado
--      ainda ficam "Reportada" (1) — sinal usado antes da existência desta coluna
--   4. vbl_vehicle_maintenance expõe status + quem reportou (hist_client) no fim
--   5. fbf_vehicle_maintenance passa a aceitar km (bug antigo: a rule de INSERT
--      nunca o repassava, ficava sempre NULL na própria linha de manutenção,
--      apesar de tb_vehicle.current_km ser sincronizado à parte) + estado inicial
--   6. fbf_vehicle_maintenance$status — transição de estado dedicada (não é
--      ledger financeiro, é metadado de fluxo de trabalho — UPDATE direto é ok)
-- Idempotente — pode ser corrido várias vezes em segurança.
-- ============================================================================

-- ── 1. Lookup de estado ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ts_maintenancestatus (
    pk    integer PRIMARY KEY,
    value text NOT NULL
);

INSERT INTO ts_maintenancestatus (pk, value)
SELECT * FROM (VALUES (1, 'Reportada'), (2, 'Em resolução'), (3, 'Resolvida')) v(pk, value)
WHERE NOT EXISTS (SELECT 1 FROM ts_maintenancestatus s WHERE s.pk = v.pk);

-- ── 2. Coluna de estado em tb_vehicle_maintenance ───────────────────────────
ALTER TABLE tb_vehicle_maintenance
    ADD COLUMN IF NOT EXISTS ts_maintenancestatus integer NOT NULL DEFAULT 3
    REFERENCES ts_maintenancestatus(pk);

-- ── 3. Backfill — avarias sem custo ainda registado ficam "Reportada" ──────
UPDATE tb_vehicle_maintenance
SET ts_maintenancestatus = 1
WHERE tt_maintenancetype = 3 AND price IS NULL;

-- ── 4. vbl_vehicle_maintenance — estado + reportado por, no fim ────────────
CREATE OR REPLACE VIEW vbl_vehicle_maintenance AS
SELECT
    b.pk, v.brand, v.model, v.licence, t.value AS tt_maintenancetype,
    b.data, b.memo, b.price, b.hist_time, b.tb_vehicle,
    b.tt_maintenancetype AS tt_maintenancetype_pk, b.km,
    s.value AS status, b.ts_maintenancestatus,
    c.name AS reported_by
FROM tb_vehicle_maintenance b
JOIN tb_vehicle v ON v.pk = b.tb_vehicle
JOIN tt_maintenancetype t ON t.pk = b.tt_maintenancetype
JOIN ts_maintenancestatus s ON s.pk = b.ts_maintenancestatus
LEFT JOIN ts_client c ON c.pk = b.hist_client;

-- ── 5. fbf_vehicle_maintenance — aceita km (corrige bug de perda no INSERT)
--       + estado inicial (default 3, avarias enviam 1 explicitamente) ──────
DROP FUNCTION IF EXISTS fbf_vehicle_maintenance(integer, integer, integer, integer, date, numeric, text) CASCADE;

CREATE FUNCTION fbf_vehicle_maintenance(
    pop integer, pnpk integer, pntb_vehicle integer, pntt_maintenancetype integer,
    pndata date, pnprice numeric, pnmemo text, pnkm integer DEFAULT NULL,
    pnts_maintenancestatus integer DEFAULT 3
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
declare
begin
 -- INSERT ZONE
 if (pop = 0) then
  insert into tb_vehicle_maintenance
    (pk, tb_vehicle, tt_maintenancetype, data, price, memo, km, ts_maintenancestatus, hist_client, hist_time)
  values
    (pnpk, pntb_vehicle, pntt_maintenancetype, pndata, pnprice, pnmemo, pnkm, pnts_maintenancestatus, fs_client(), current_timestamp);
  return pnpk;
 end if;

 -- UPDATE ZONE
 if (pop = 1) then
  select fs_errors (2, 'vehicle_maintenance');
 end if;

 -- DELETE ZONE
 if (pop = 2) then
  select fs_errors (8, 'vehicle_maintenance');
 end if;
end; $function$;

CREATE RULE rbi_vehicle_maintenance AS ON INSERT TO vbf_vehicle_maintenance DO INSTEAD
    SELECT fbf_vehicle_maintenance(0, new.pk, new.tb_vehicle, new.tt_maintenancetype, new.data, new.price, new.memo, new.km);
CREATE RULE rbu_vehicle_maintenance AS ON UPDATE TO vbf_vehicle_maintenance DO INSTEAD
    SELECT fbf_vehicle_maintenance(1, new.pk, new.tb_vehicle, new.tt_maintenancetype, new.data, new.price, new.memo, new.km);
CREATE RULE rbd_vehicle_maintenance AS ON DELETE TO vbf_vehicle_maintenance DO INSTEAD
    SELECT fbf_vehicle_maintenance(2, old.pk, old.tb_vehicle, old.tt_maintenancetype, old.data, old.price, old.memo, old.km);

-- ── 6. Transição de estado dedicada (workflow, não ledger — UPDATE direto) ──
CREATE OR REPLACE FUNCTION fbf_vehicle_maintenance$status(pnpk integer, pnstatus integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $function$
declare
begin
 update tb_vehicle_maintenance set ts_maintenancestatus = pnstatus where pk = pnpk;
 return pnpk;
end; $function$;
