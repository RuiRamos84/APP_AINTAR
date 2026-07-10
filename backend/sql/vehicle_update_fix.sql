-- =============================================================
-- Frota — Corrige fbf_vehicle: iuc_date/current_km nunca eram gravados
-- Data: 2026-07-11
--
-- Bug: a migração de 2026-07-03 (vehicle_fleet_extension.sql) acrescentou
-- delivery_km/current_km/iuc_date à VIEW vbf_vehicle, mas nunca atualizou a
-- função fbf_vehicle() nem as regras rbi_/rbu_/rbd_vehicle que a chamam —
-- por isso qualquer UPDATE (ou INSERT) a vbf_vehicle era substituído pela
-- regra "DO INSTEAD" por uma chamada a fbf_vehicle() com só 8 parâmetros,
-- e essas 3 colunas eram sempre silenciosamente ignoradas (current_km só
-- ficava correto quando sincronizado à parte por add_vehicle_maintenance,
-- via UPDATE direto a tb_vehicle).
--
-- CREATE OR REPLACE FUNCTION não permite acrescentar parâmetros a uma
-- função com regras dependentes — por isso DROP ... CASCADE + recriar as
-- 3 regras (mesma mecânica já usada em fleet_interconnect.sql para
-- fbf_vehicle_assign e em fleet_maintenance_status.sql para
-- fbf_vehicle_maintenance).
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- =============================================================

DROP FUNCTION IF EXISTS fbf_vehicle(integer, integer, text, text, text, date, date, date) CASCADE;

CREATE FUNCTION fbf_vehicle(
    pop integer, pnpk integer, pnbrand text, pnmodel text, pnlicence text,
    pndelivery date, pninsurance_date date, pninspection_date date,
    pndelivery_km integer DEFAULT 0, pncurrent_km integer DEFAULT NULL,
    pniuc_date date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
begin
 -- INSERT ZONE
 if (pop = 0) then
  insert into tb_vehicle (pk, brand, model, licence, delivery, insurance_date, inspection_date,
                          delivery_km, current_km, iuc_date, hist_client, hist_time)
  values (pnpk, pnbrand, pnmodel, pnlicence, pndelivery, pninsurance_date, pninspection_date,
          COALESCE(pndelivery_km, 0), pncurrent_km, pniuc_date, fs_client(), current_timestamp);
  return pnpk;
 end if;

 -- UPDATE ZONE
 -- brand/model/licence/delivery/delivery_km ficam de fora de propósito —
 -- imutáveis após criação (mesma regra de negócio já aplicada no frontend,
 -- VehicleFormModal.jsx: disabled={isEditMode}).
 if (pop = 1) then
  update tb_vehicle set
   insurance_date = pninsurance_date,
   inspection_date = pninspection_date,
   current_km = pncurrent_km,
   iuc_date = pniuc_date
  where pk = pnpk;

  return pnpk;
 end if;

 -- DELETE ZONE
 if (pop = 2) then
  select fs_errors (8, 'vehicle');
 end if;
end; $function$;

CREATE RULE rbi_vehicle AS
    ON INSERT TO vbf_vehicle DO INSTEAD
    SELECT fbf_vehicle(0, new.pk, new.brand, new.model, new.licence, new.delivery,
                        new.insurance_date, new.inspection_date,
                        new.delivery_km, new.current_km, new.iuc_date) AS fbf_vehicle;

CREATE RULE rbu_vehicle AS
    ON UPDATE TO vbf_vehicle DO INSTEAD
    SELECT fbf_vehicle(1, new.pk, new.brand, new.model, new.licence, new.delivery,
                        new.insurance_date, new.inspection_date,
                        new.delivery_km, new.current_km, new.iuc_date) AS fbf_vehicle;

CREATE RULE rbd_vehicle AS
    ON DELETE TO vbf_vehicle DO INSTEAD
    SELECT fbf_vehicle(2, old.pk, old.brand, old.model, old.licence, old.delivery,
                        old.insurance_date, old.inspection_date,
                        old.delivery_km, old.current_km, old.iuc_date) AS fbf_vehicle;

-- ── Verificação ────────────────────────────────────────────────────────────
SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'fbf_vehicle';
SELECT rulename FROM pg_rules WHERE tablename = 'vbf_vehicle' ORDER BY rulename;
