-- =============================================================
-- Frota — Extensão da Ficha de Veículo: Km, IUC e Alertas de Manutenção
-- Data: 2026-07-03
--
-- Adiciona:
--   - Quilometragem atual e de entrega (tb_vehicle)
--   - Data de IUC (Imposto Único de Circulação), mesmo padrão de insurance_date
--   - Km em cada registo de manutenção (tb_vehicle_maintenance)
--   - Intervalos de km/meses por tipo de manutenção (tt_maintenancetype),
--     para alertas proativos "a cada X km OU Y meses, o que ocorrer primeiro"
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- =============================================================

-- ── 1. Colunas novas ──────────────────────────────────────────────────────────
ALTER TABLE tb_vehicle ADD COLUMN IF NOT EXISTS current_km integer;
ALTER TABLE tb_vehicle ADD COLUMN IF NOT EXISTS delivery_km integer NOT NULL DEFAULT 0;
ALTER TABLE tb_vehicle ADD COLUMN IF NOT EXISTS iuc_date date;

ALTER TABLE tb_vehicle_maintenance ADD COLUMN IF NOT EXISTS km integer;

ALTER TABLE tt_maintenancetype ADD COLUMN IF NOT EXISTS interval_km integer;
ALTER TABLE tt_maintenancetype ADD COLUMN IF NOT EXISTS interval_months integer;

-- ── 2. Seed dos intervalos por omissão ────────────────────────────────────────
-- Tabela com 3 linhas fixas, sem UI de CRUD (igual ao resto do projeto) — ajustar
-- valores diretamente aqui/por SQL se necessário no futuro.
UPDATE tt_maintenancetype SET interval_km = 15000, interval_months = 12 WHERE value = 'Revisão';
UPDATE tt_maintenancetype SET interval_km = 40000, interval_months = NULL WHERE value = 'Pneus';
-- 'Reparação' fica sem intervalo (NULL/NULL) — não é uma manutenção periódica, não entra no alerta.

-- ── 3. Views — vbl_vehicle / vbf_vehicle ──────────────────────────────────────
-- IMPORTANTE: CREATE OR REPLACE VIEW só permite ACRESCENTAR colunas no fim da
-- lista já existente — não pode reordenar/inserir no meio (Postgres rejeita
-- com "cannot change name/type of view column"). Por isso as colunas novas
-- (delivery_km, current_km, iuc_date) vão sempre depois das já existentes.
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
    b.iuc_date
FROM tb_vehicle b;

CREATE OR REPLACE VIEW vbf_vehicle AS
SELECT
    pk,
    brand,
    model,
    licence,
    delivery,
    insurance_date,
    inspection_date,
    hist_time,
    delivery_km,
    current_km,
    iuc_date
FROM tb_vehicle;

-- ── 4. Views — vbl_vehicle_maintenance / vbf_vehicle_maintenance ─────────────
-- Aditivo (mesma regra de "só acrescentar no fim"): mantém tt_maintenancetype
-- como texto (já usado por MaintenanceList.jsx), acrescenta tb_vehicle e
-- tt_maintenancetype_pk (em falta até agora, necessários para o frontend
-- cruzar manutenções com veículos/tipos no cálculo de alertas) e km, todos no fim.
CREATE OR REPLACE VIEW vbl_vehicle_maintenance AS
SELECT
    b.pk,
    v.brand,
    v.model,
    v.licence,
    t.value AS tt_maintenancetype,
    b.data,
    b.memo,
    b.price,
    b.hist_time,
    b.tb_vehicle,
    b.tt_maintenancetype AS tt_maintenancetype_pk,
    b.km
FROM tb_vehicle_maintenance b
JOIN tb_vehicle v ON v.pk = b.tb_vehicle
JOIN tt_maintenancetype t ON t.pk = b.tt_maintenancetype;

CREATE OR REPLACE VIEW vbf_vehicle_maintenance AS
SELECT
    pk,
    tb_vehicle,
    tt_maintenancetype,
    data,
    price,
    memo,
    hist_time,
    km
FROM tb_vehicle_maintenance;

-- ── 5. View — vbl_maintenancetype (usada em meta_data_service.py) ───────────
CREATE OR REPLACE VIEW vbl_maintenancetype AS
SELECT b.pk, b.value, b.interval_km, b.interval_months
FROM tt_maintenancetype b
ORDER BY b.value;

-- ── 6. Verificação ────────────────────────────────────────────────────────────
SELECT pk, value, interval_km, interval_months FROM tt_maintenancetype ORDER BY pk;
