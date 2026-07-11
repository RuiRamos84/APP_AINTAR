-- =============================================================
-- Frota — fbf_vehicle_maintenance$status ganha price/memo opcionais
-- Data: 2026-07-11
--
-- Bug/gap: ao reportar uma avaria via "A Minha Viatura", o registo nasce
-- com price=0/memo=NULL (stub). Ao resolver a avaria (transição de estado
-- para "Resolvida"), não havia forma de informar o que foi feito nem o
-- custo real — fbf_vehicle_maintenance$status só mudava o estado.
-- fbf_vehicle_maintenance continua com o UPDATE genérico bloqueado de
-- propósito (histórico imutável) — por isso a extensão vai para a função
-- de transição de estado, não para um UPDATE genérico.
--
-- Sem regras DO INSTEAD dependentes desta função (confirmado via
-- pg_depend) — DROP simples, sem CASCADE.
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- =============================================================

DROP FUNCTION IF EXISTS "fbf_vehicle_maintenance$status"(integer, integer);

CREATE FUNCTION "fbf_vehicle_maintenance$status"(
    pnpk integer, pnstatus integer,
    pnprice numeric DEFAULT NULL, pnmemo text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
begin
 -- COALESCE de propósito: esta função também é chamada só para mudar de
 -- estado (ex: Reportada → Em resolução), sem price/memo — não pode
 -- zerar valores já existentes quando não são enviados.
 update tb_vehicle_maintenance set
  ts_maintenancestatus = pnstatus,
  price = COALESCE(pnprice, price),
  memo = COALESCE(pnmemo, memo)
 where pk = pnpk;

 return pnpk;
end; $function$;

-- ── Verificação ────────────────────────────────────────────────────────────
SELECT pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'fbf_vehicle_maintenance$status';
