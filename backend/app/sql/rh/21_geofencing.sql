-- backend/app/sql/rh/21_geofencing.sql
-- Geofencing — locais predefinidos por colaborador e alertas de registo fora do local
-- Executar APÓS 18_filtro_perfis_rh.sql

-- ─── 1. Tabela ts_rh_local ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ts_rh_local (
    pk          INTEGER       NOT NULL DEFAULT fs_nextcode(),
    nome        VARCHAR(100)  NOT NULL,
    descr       VARCHAR(200),
    latitude    DECIMAL(10,8) NOT NULL,
    longitude   DECIMAL(11,8) NOT NULL,
    raio_metros INTEGER       NOT NULL DEFAULT 200,
    ativo       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_ts_rh_local PRIMARY KEY (pk)
);

CREATE INDEX IF NOT EXISTS idx_ts_rh_local_ativo ON ts_rh_local (ativo) WHERE ativo = TRUE;


-- ─── 2. Extensões às tabelas existentes ───────────────────────────────────────

-- Cada colaborador pode ter um local predefinido para validação GPS
ALTER TABLE ts_rh_colaborador
    ADD COLUMN IF NOT EXISTS ts_rh_local_fk INTEGER REFERENCES ts_rh_local(pk);

-- Resultado do geofencing em cada registo de ponto
ALTER TABLE tb_rh_ponto
    ADD COLUMN IF NOT EXISTS fora_local       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS distancia_metros INTEGER;


-- ─── 3. Função Haversine ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_rh_distancia_metros(
    p_lat1 DECIMAL, p_lon1 DECIMAL,
    p_lat2 DECIMAL, p_lon2 DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
    v_r    CONSTANT DECIMAL := 6371000;
    v_dlat DECIMAL := RADIANS(p_lat2 - p_lat1);
    v_dlon DECIMAL := RADIANS(p_lon2 - p_lon1);
    v_a    DECIMAL;
BEGIN
    v_a := POWER(SIN(v_dlat / 2), 2)
         + COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2)) * POWER(SIN(v_dlon / 2), 2);
    RETURN ROUND(v_r * 2 * ATAN2(SQRT(v_a), SQRT(1 - v_a)))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ─── 4. fbo_rh_ponto_evento — com cálculo de geofencing ──────────────────────

CREATE OR REPLACE FUNCTION fbo_rh_ponto_evento(
    p_user_fk       INTEGER,
    p_tt_evento_fk  INTEGER,
    p_latitude      DECIMAL,
    p_longitude     DECIMAL,
    p_precisao      INTEGER,
    p_notas         TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk         INTEGER;
    v_data       DATE    := CURRENT_DATE;
    v_jornada    INTEGER;
    v_local_lat  DECIMAL;
    v_local_lon  DECIMAL;
    v_raio       INTEGER;
    v_distancia  INTEGER;
    v_fora_local BOOLEAN := FALSE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM tb_rh_ponto
        WHERE tb_user_fk = p_user_fk
          AND data = v_data
          AND tt_evento_fk = p_tt_evento_fk
    ) THEN
        RETURN '<error>Evento já registado para hoje</error>';
    END IF;

    IF p_tt_evento_fk IN (2, 3) THEN
        SELECT tt_jornada_fk INTO v_jornada
        FROM ts_rh_horario
        WHERE tb_user_fk = p_user_fk AND data_fim IS NULL
        LIMIT 1;

        IF v_jornada = 2 THEN
            RETURN '<error>Jornada contínua não tem registo de almoço</error>';
        END IF;
    END IF;

    IF p_tt_evento_fk = 4 THEN
        IF NOT EXISTS (
            SELECT 1 FROM tb_rh_ponto
            WHERE tb_user_fk = p_user_fk AND data = v_data AND tt_evento_fk = 1
        ) THEN
            RETURN '<error>Não é possível registar saída sem entrada</error>';
        END IF;
    END IF;

    -- Geofencing: calcular distância ao local predefinido (só se GPS disponível)
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        SELECT l.latitude, l.longitude, l.raio_metros
        INTO v_local_lat, v_local_lon, v_raio
        FROM ts_rh_colaborador col
        JOIN ts_rh_local l ON l.pk = col.ts_rh_local_fk
        WHERE col.pk = p_user_fk AND l.ativo = TRUE
        LIMIT 1;

        IF FOUND THEN
            v_distancia  := fn_rh_distancia_metros(p_latitude, p_longitude, v_local_lat, v_local_lon);
            v_fora_local := (v_distancia > v_raio);
        END IF;
    END IF;

    v_pk := fs_nextcode();

    INSERT INTO tb_rh_ponto (
        pk, tb_user_fk, data, tt_evento_fk, ts_registo,
        latitude, longitude, precisao_metros, fonte, notas,
        fora_local, distancia_metros
    ) VALUES (
        v_pk, p_user_fk, v_data, p_tt_evento_fk, NOW(),
        p_latitude, p_longitude, p_precisao, 'app', p_notas,
        v_fora_local, v_distancia
    );

    RETURN '<sucess>|pk=' || v_pk || '|fora_local=' || v_fora_local::TEXT;
END;
$$ LANGUAGE plpgsql;


-- ─── 5. CRUD para ts_rh_local ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fbo_rh_local(
    p_op          INTEGER,  -- 0 INSERT, 1 UPDATE, 2 DELETE
    p_pk          INTEGER  DEFAULT NULL,
    p_nome        VARCHAR  DEFAULT NULL,
    p_descr       VARCHAR  DEFAULT NULL,
    p_latitude    DECIMAL  DEFAULT NULL,
    p_longitude   DECIMAL  DEFAULT NULL,
    p_raio_metros INTEGER  DEFAULT NULL,
    p_ativo       BOOLEAN  DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
    IF p_op = 0 THEN  -- INSERT
        INSERT INTO ts_rh_local (pk, nome, descr, latitude, longitude, raio_metros, ativo)
        VALUES (
            fs_nextcode(),
            p_nome,
            p_descr,
            p_latitude,
            p_longitude,
            COALESCE(p_raio_metros, 200),
            COALESCE(p_ativo, TRUE)
        );
        RETURN '<sucess>Local criado';

    ELSIF p_op = 1 THEN  -- UPDATE
        IF NOT EXISTS (SELECT 1 FROM ts_rh_local WHERE pk = p_pk) THEN
            RETURN '<error>Local não encontrado: ' || p_pk || '</error>';
        END IF;
        UPDATE ts_rh_local SET
            nome        = COALESCE(p_nome,        nome),
            descr       = COALESCE(p_descr,       descr),
            latitude    = COALESCE(p_latitude,    latitude),
            longitude   = COALESCE(p_longitude,   longitude),
            raio_metros = COALESCE(p_raio_metros, raio_metros),
            ativo       = COALESCE(p_ativo,       ativo)
        WHERE pk = p_pk;
        RETURN '<sucess>Local actualizado';

    ELSIF p_op = 2 THEN  -- DELETE
        IF NOT EXISTS (SELECT 1 FROM ts_rh_local WHERE pk = p_pk) THEN
            RETURN '<error>Local não encontrado: ' || p_pk || '</error>';
        END IF;
        IF EXISTS (SELECT 1 FROM ts_rh_colaborador WHERE ts_rh_local_fk = p_pk) THEN
            RETURN '<error>Não é possível eliminar — existem colaboradores associados a este local</error>';
        END IF;
        DELETE FROM ts_rh_local WHERE pk = p_pk;
        RETURN '<sucess>Local eliminado';
    END IF;

    RETURN '<error>Operação inválida</error>';
END;
$$ LANGUAGE plpgsql;


-- ─── 6. Atribuir local predefinido a colaborador ───────────────────────────────

CREATE OR REPLACE FUNCTION fbo_rh_col_set_local(
    p_user_fk  INTEGER,
    p_local_fk INTEGER  -- NULL para remover
)
RETURNS TEXT AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ts_rh_colaborador WHERE pk = p_user_fk) THEN
        RETURN '<error>Colaborador não encontrado: ' || p_user_fk || '</error>';
    END IF;
    IF p_local_fk IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM ts_rh_local WHERE pk = p_local_fk AND ativo = TRUE
    ) THEN
        RETURN '<error>Local não encontrado ou inactivo: ' || p_local_fk || '</error>';
    END IF;
    UPDATE ts_rh_colaborador SET ts_rh_local_fk = p_local_fk WHERE pk = p_user_fk;
    RETURN '<sucess>Local atribuído';
END;
$$ LANGUAGE plpgsql;


-- ─── 7. Actualizar vbl_rh_ponto ───────────────────────────────────────────────

DROP VIEW IF EXISTS vbl_rh_ponto CASCADE;
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


-- ─── 8. Vista de locais predefinidos ──────────────────────────────────────────

CREATE OR REPLACE VIEW vbl_rh_local AS
SELECT
    l.pk,
    l.nome,
    l.descr,
    l.latitude,
    l.longitude,
    l.raio_metros,
    l.ativo,
    l.created_at,
    COUNT(col.pk) AS total_colaboradores
FROM ts_rh_local l
LEFT JOIN ts_rh_colaborador col ON col.ts_rh_local_fk = l.pk
GROUP BY l.pk, l.nome, l.descr, l.latitude, l.longitude, l.raio_metros, l.ativo, l.created_at;


-- ─── 9. Vista de alertas de geofencing ────────────────────────────────────────

CREATE OR REPLACE VIEW vbl_rh_ponto_alertas AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                          AS colaborador_nome,
    p.data,
    p.tt_evento_fk,
    e.descr                         AS evento_descr,
    p.ts_registo,
    p.latitude,
    p.longitude,
    p.precisao_metros,
    p.distancia_metros,
    l.nome                          AS local_nome,
    l.raio_metros                   AS local_raio,
    col.superior_fk
FROM tb_rh_ponto p
JOIN ts_client c                ON c.pk = p.tb_user_fk
JOIN tt_rh_ponto_evento e       ON e.pk = p.tt_evento_fk
LEFT JOIN ts_rh_colaborador col ON col.pk = p.tb_user_fk
LEFT JOIN ts_rh_local l         ON l.pk = col.ts_rh_local_fk
WHERE p.fora_local = TRUE;


-- ─── 10. Verificação ─────────────────────────────────────────────────────────

SELECT 'ts_rh_local' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'ts_rh_local'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;

SELECT 'fn_rh_distancia_metros (500m)' AS check_name,
    CASE WHEN fn_rh_distancia_metros(38.7169, -9.1399, 38.7213, -9.1399) BETWEEN 480 AND 520
    THEN 'OK' ELSE 'FALHOU' END AS resultado;
