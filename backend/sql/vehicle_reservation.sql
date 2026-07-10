-- =============================================================
-- Frota — Reserva de Viaturas de Serviço
-- Data: 2026-07-02
--
-- Adiciona a entidade de RESERVA (agendamento futuro, com período
-- e prevenção de sobreposição) como extensão do módulo de Frota
-- já existente (tb_vehicle, tb_vehicle_assign, tb_vehicle_maintenance).
--
-- Reserva != Atribuição: tb_vehicle_assign regista um facto passado
-- numa data única, sem período nem estado. Reserva é planeamento
-- futuro com intervalo [início, fim) e não pode sobrepor outra
-- reserva ativa da mesma viatura — daí a entidade nova.
--
-- IDEMPOTENTE: seguro correr múltiplas vezes.
-- =============================================================

-- ── 1. Tabela base ────────────────────────────────────────────────────────────
-- ts_reservationstatus: 1=Agendada, 3=Concluída, 4=Cancelada.
-- "Em curso"/"Terminada" são calculados em vbl_vehicle_reservation, não persistidos.
-- hist_client/hist_time com DEFAULT (em vez de depender do service para os preencher,
-- como acontece hoje em tb_vehicle_assign) para garantir auditoria mínima mesmo
-- em INSERT/UPDATE directos à view vbf_vehicle_reservation.
--
-- start_time/end_time em "timestamp" sem fuso (igual ao resto do esquema de frota):
-- confirmado por introspecção que a BD tem `timezone = Europe/Lisbon` fixo ao
-- nível do servidor/role (não é algo que a app defina por sessão), pelo que o
-- Postgres já converte correctamente UTC (enviado pelo frontend via
-- `Date.toISOString()`) para a hora local de Lisboa em cada escrita/leitura,
-- respeitando DST automaticamente (zona IANA, não offset fixo). timestamptz
-- só traria valor se essa configuração de sessão pudesse mudar — não é o caso.
CREATE TABLE IF NOT EXISTS tb_vehicle_reservation (
    pk                     integer PRIMARY KEY,
    tb_vehicle             integer NOT NULL REFERENCES tb_vehicle(pk),
    ts_client              integer NOT NULL REFERENCES ts_client(pk),
    start_time             timestamp NOT NULL,
    end_time               timestamp NOT NULL,
    destination            text NOT NULL,
    memo                   text,
    ts_reservationstatus   integer NOT NULL DEFAULT 1
                           CHECK (ts_reservationstatus IN (1, 3, 4)),
    hist_client            integer DEFAULT fs_client(),
    hist_time              timestamp DEFAULT current_timestamp,
    CONSTRAINT vehicle_reservation_dates_check CHECK (end_time > start_time)
);

-- ── 2. Prevenção de sobreposição (guard absoluto na BD) ──────────────────────
-- Duas reservas ATIVAS (status=1) da mesma viatura nunca podem ter
-- intervalos que se sobrepõem. Cancelar/concluir uma reserva liberta o slot.
--
-- Abordagem escolhida: trigger + pg_advisory_xact_lock, em vez de
-- EXCLUDE USING gist (que exigiria a extensão btree_gist — indisponível
-- neste servidor: "Could not open extension control file .../btree_gist.control").
-- O advisory lock por viatura serializa transações concorrentes para o MESMO
-- tb_vehicle: a 2ª transação só corre a verificação depois da 1ª ter
-- terminado (commit ou rollback), fechando a mesma race condition que o
-- EXCLUDE resolveria — sem depender de nenhuma extensão do SO.
CREATE OR REPLACE FUNCTION fbh_vehicle_reservation_overlap()
RETURNS trigger AS $$
BEGIN
    IF NEW.ts_reservationstatus = 1 THEN
        -- Serializa por viatura (liberta automaticamente no fim da transação)
        PERFORM pg_advisory_xact_lock(NEW.tb_vehicle::bigint);

        IF EXISTS (
            SELECT 1 FROM tb_vehicle_reservation r
            WHERE r.tb_vehicle = NEW.tb_vehicle
              AND r.pk <> NEW.pk
              AND r.ts_reservationstatus = 1
              AND tsrange(r.start_time, r.end_time, '[)') && tsrange(NEW.start_time, NEW.end_time, '[)')
        ) THEN
            RAISE EXCEPTION 'vehicle_reservation_no_overlap: A viatura já está reservada nesse período.'
                USING ERRCODE = '23P01';  -- exclusion_violation, mapeado para 409 em map_sql_error()
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgc_vehicle_reservation_no_overlap ON tb_vehicle_reservation;
CREATE TRIGGER tgc_vehicle_reservation_no_overlap
    BEFORE INSERT OR UPDATE ON tb_vehicle_reservation
    FOR EACH ROW
    EXECUTE FUNCTION fbh_vehicle_reservation_overlap();

-- ── 3. View de leitura (com labels e estado calculado) ───────────────────────
CREATE OR REPLACE VIEW vbl_vehicle_reservation AS
SELECT
    r.pk,
    r.tb_vehicle,
    v.brand,
    v.model,
    v.licence,
    r.ts_client,
    c.name AS client_name,
    r.start_time,
    r.end_time,
    r.destination,
    r.memo,
    r.ts_reservationstatus,
    CASE
        WHEN r.ts_reservationstatus = 4 THEN 'Cancelada'
        WHEN r.ts_reservationstatus = 3 THEN 'Concluída'
        WHEN current_timestamp BETWEEN r.start_time AND r.end_time THEN 'Em curso'
        WHEN current_timestamp > r.end_time THEN 'Terminada'
        ELSE 'Agendada'
    END AS estado_atual,
    r.hist_client,
    r.hist_time
FROM tb_vehicle_reservation r
JOIN tb_vehicle v ON v.pk = r.tb_vehicle
JOIN ts_client c ON c.pk = r.ts_client;

-- ── 4. View de escrita (1:1, auto-actualizável — mesmo padrão de vbf_vehicle_assign) ─
CREATE OR REPLACE VIEW vbf_vehicle_reservation AS
SELECT
    pk,
    tb_vehicle,
    ts_client,
    start_time,
    end_time,
    destination,
    memo,
    ts_reservationstatus,
    hist_client,
    hist_time
FROM tb_vehicle_reservation;

-- ── 5. Permissões (ts_interface) ──────────────────────────────────────────────
-- PKs via fs_nextcode() (não gama manual — os PKs manuais 1600-1615 já usados por
-- outros módulos entram em conflito entre ambientes; fs_nextcode() evita-o, ver rh/16_permissions.sql)
INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT fs_nextcode(), 'fleet.reservations.view', 'Frota', 'Ver Reservas',
       'Consultar reservas e disponibilidade de viaturas', 'event_available', 832
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.reservations.view');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT fs_nextcode(), 'fleet.reservations.create', 'Frota', 'Reservar Viatura',
       'Criar, editar e cancelar reservas próprias (requer fleet.reservations.view)', 'event', 833
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.reservations.create');

INSERT INTO ts_interface (pk, value, category, label, description, icon, sort_order)
SELECT fs_nextcode(), 'fleet.reservations.manage', 'Frota', 'Gerir Reservas de Terceiros',
       'Editar e cancelar reservas de outros colaboradores (requer fleet.reservations.create)', 'admin_panel_settings', 834
WHERE NOT EXISTS (SELECT 1 FROM ts_interface WHERE value = 'fleet.reservations.manage');

-- Cascata de dependências
UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'fleet.reservations.view')
WHERE value = 'fleet.reservations.create';

UPDATE ts_interface
SET requires = ARRAY(SELECT pk FROM ts_interface WHERE value = 'fleet.reservations.create')
WHERE value = 'fleet.reservations.manage';

-- ── 6. Verificação ────────────────────────────────────────────────────────────
SELECT
    pk, value, label, sort_order,
    CASE WHEN requires IS NOT NULL AND array_length(requires, 1) > 0
         THEN (SELECT value FROM ts_interface r WHERE r.pk = requires[1])
         ELSE '—'
    END AS requer
FROM ts_interface
WHERE value LIKE 'fleet.reservations.%'
ORDER BY sort_order;
-- Deve retornar 3 linhas com a cascata correcta (create -> view, manage -> create)
