-- backend/app/sql/rh/07_fn_dias_uteis.sql

CREATE OR REPLACE FUNCTION fn_rh_dias_uteis(
    p_inicio DATE,
    p_fim    DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_count   INTEGER := 0;
    v_current DATE    := p_inicio;
    v_dow     INTEGER;
BEGIN
    IF p_inicio > p_fim THEN
        RETURN 0;
    END IF;

    WHILE v_current <= p_fim LOOP
        v_dow := EXTRACT(DOW FROM v_current)::INTEGER;

        IF v_dow NOT IN (0, 6) THEN
            IF NOT EXISTS (
                SELECT 1 FROM ts_feriados
                WHERE data = v_current AND nacional = TRUE
            ) THEN
                v_count := v_count + 1;
            END IF;
        END IF;

        v_current := v_current + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;
