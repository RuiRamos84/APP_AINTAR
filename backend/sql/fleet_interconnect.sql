-- =============================================================
-- Frota Interligada — Disponibilidade, Devolução à Pool e "A Minha Viatura"
-- Data: 2026-07-03 (revisto no mesmo dia — ver nota abaixo)
--
-- Liga as 4 sub-áreas da Frota (Veículos, Atribuições, Reservas,
-- Manutenções) que hoje não se verificam entre si:
--
--   1. vbl_vehicle passa a expor current_assignee (nome do condutor com
--      atribuição perpétua ativa, ou NULL = viatura em pool) — usado para
--      corrigir o bug em que uma viatura atribuída aparecia "Livre" nas
--      Reservas e podia ser reservada por outra pessoa.
--   2. tb_vehicle_assign ganha end_date: "devolver à pool" insere uma NOVA
--      linha já com end_date preenchido (nunca UPDATE/DELETE — fbf_vehicle_assign
--      bloqueia ambos de propósito, pop=1/2 chamam fs_errors: mesmo padrão
--      "nunca apagar, corrige com novo registo" do resto da BD, ex. tb_caixa).
--      ts_client NUNCA pode ser NULL (CHECK tb_vehicle_assign_nn04, confirmado
--      em produção) — por isso a linha de devolução mantém o último condutor,
--      só que já com end_date = data da devolução.
--   3. Novas permissões fleet.myvehicle.view/.report para o widget
--      self-service "A Minha Viatura" (reporte de avarias).
--
-- PRÉ-REQUISITO: correr vehicle_fleet_extension.sql antes deste script
-- (current_km, delivery_km, iuc_date têm de existir em tb_vehicle).
--
-- IDEMPOTENTE: seguro correr múltiplas vezes (DROP FUNCTION ... CASCADE + as
-- 3 regras recriadas a seguir, sempre juntas no mesmo script).
-- =============================================================

-- ── 0. Coluna nova em tb_vehicle_assign ───────────────────────────────────────
ALTER TABLE tb_vehicle_assign ADD COLUMN IF NOT EXISTS end_date date;

-- ── 1. vbl_vehicle — acrescenta current_assignee no fim ──────────────────────
-- Regra de CREATE OR REPLACE VIEW: só se pode ACRESCENTAR colunas no fim da
-- lista já existente, nunca inserir no meio.
CREATE OR REPLACE VIEW vbl_vehicle AS
SELECT
    b.pk,
    b.brand,
    b.model,
    b.licence,
    b.delivery,
    b.insurance_date,
    b.inspection_date,
    b.hist_time,
    b.delivery_km,
    b.current_km,
    b.iuc_date,
    -- Atribuição vigente = registo mais recente (hist_time = quando foi
    -- decidido, não "data" — introduzida pelo utilizador sem restrição de
    -- futuro/passado). Só devolve nome se essa linha ainda não tiver
    -- end_date (senão a viatura já foi devolvida à pool).
    (SELECT CASE WHEN a.end_date IS NULL THEN c.name ELSE NULL END
       FROM tb_vehicle_assign a
       JOIN ts_client c ON c.pk = a.ts_client
       WHERE a.tb_vehicle = b.pk
       ORDER BY a.hist_time DESC, a.pk DESC
       LIMIT 1) AS current_assignee
FROM tb_vehicle b;

-- ── 2. vbl_vehicle_assign — end_date + is_current (ativa E vigente) ──────────
-- ts_client nunca é NULL (constraint da BD) — JOIN normal, sem LEFT JOIN.
-- "is_current" = true só na linha mais recente por viatura E ainda sem
-- end_date — usado pelo frontend para decidir se mostra "Devolver à pool".
CREATE OR REPLACE VIEW vbl_vehicle_assign AS
SELECT
    b.pk,
    v.brand,
    v.model,
    v.licence,
    b.data,
    c.name AS ts_client,
    b.hist_time,
    b.tb_vehicle,
    (b.end_date IS NULL AND b.pk = (
        SELECT a.pk FROM tb_vehicle_assign a
        WHERE a.tb_vehicle = b.tb_vehicle
        ORDER BY a.hist_time DESC, a.pk DESC
        LIMIT 1
    )) AS is_current,
    b.end_date
FROM tb_vehicle_assign b
JOIN tb_vehicle v ON b.tb_vehicle = v.pk
JOIN ts_client c ON b.ts_client = c.pk;

-- ── 3. vbf_vehicle_assign — acrescenta end_date (para o INSERT de "devolver") ─
CREATE OR REPLACE VIEW vbf_vehicle_assign AS
SELECT
    pk,
    tb_vehicle,
    data,
    ts_client,
    hist_time,
    end_date
FROM tb_vehicle_assign;

-- ── 3b. fbf_vehicle_assign — 6º parâmetro (end_date), só na zona de INSERT ────
-- UPDATE (pop=1) e DELETE (pop=2) continuam bloqueados por fs_errors, tal como
-- já estavam — não são alterados aqui. CREATE OR REPLACE FUNCTION não permite
-- acrescentar parâmetros a uma função já usada por regras (DO INSTEAD), por
-- isso: DROP ... CASCADE (derruba as 3 regras) + recriar função + recriar as
-- 3 regras, sempre juntos no mesmo script.
DROP FUNCTION IF EXISTS fbf_vehicle_assign(integer, integer, integer, date, integer) CASCADE;

CREATE FUNCTION fbf_vehicle_assign(
    pop integer, pnpk integer, pntb_vehicle integer, pndata date,
    pnts_client integer, pnend_date date DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
begin
 -- INSERT ZONE
 if (pop = 0) then
  insert into tb_vehicle_assign (pk, tb_vehicle, data, ts_client, end_date, hist_client, hist_time)
  values (pnpk, pntb_vehicle, pndata, pnts_client, pnend_date, fs_client(), current_timestamp);
  return pnpk;
 end if;

 -- UPDATE ZONE
 if (pop = 1) then
  select fs_errors (2, 'vehicle_assign');
 end if;

 -- DELETE ZONE
 if (pop = 2) then
  select fs_errors (8, 'vehicle_assign');
 end if;
end; $function$;

CREATE RULE rbi_vehicle_assign AS
    ON INSERT TO vbf_vehicle_assign DO INSTEAD
    SELECT fbf_vehicle_assign(0, new.pk, new.tb_vehicle, new.data, new.ts_client, new.end_date);

CREATE RULE rbu_vehicle_assign AS
    ON UPDATE TO vbf_vehicle_assign DO INSTEAD
    SELECT fbf_vehicle_assign(1, new.pk, new.tb_vehicle, new.data, new.ts_client, new.end_date);

CREATE RULE rbd_vehicle_assign AS
    ON DELETE TO vbf_vehicle_assign DO INSTEAD
    SELECT fbf_vehicle_assign(2, old.pk, old.tb_vehicle, old.data, old.ts_client, old.end_date);

-- ── 4. Permissões (ts_interface) — "A Minha Viatura" ─────────────────────────
INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT fs_nextcode(), 'fleet.myvehicle.view', 'Frota', 'A Minha Viatura',
       'Ver a viatura atualmente atribuída ou reservada pelo próprio utilizador', 'directions_car', 835
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.myvehicle.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT fs_nextcode(), 'fleet.myvehicle.report', 'Frota', 'Reportar Avaria',
       'Reportar avaria ou atualizar km da viatura atual (requer fleet.myvehicle.view)', 'report_problem', 836
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.myvehicle.report');

UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'fleet.myvehicle.view')
WHERE value = 'fleet.myvehicle.report';

-- ── 5. Verificação ────────────────────────────────────────────────────────────
SELECT pk, brand, model, licence, current_km, current_assignee FROM vbl_vehicle ORDER BY pk;
SELECT pk, tb_vehicle, ts_client, end_date, is_current FROM vbl_vehicle_assign ORDER BY tb_vehicle, hist_time DESC;
SELECT pk, value, label, sort_order FROM ts_interface WHERE value LIKE 'fleet.myvehicle.%' ORDER BY sort_order;
