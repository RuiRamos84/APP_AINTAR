-- backend/app/sql/rh/12_fbo_horario.sql

CREATE OR REPLACE FUNCTION fbo_rh_horario(
    p_op                 INTEGER,
    p_pk                 INTEGER,
    p_user_fk            INTEGER,
    p_tt_jornada_fk      INTEGER,
    p_descr              VARCHAR,
    p_hora_entrada       TIME,
    p_hora_saida         TIME,
    p_hora_inicio_almoco TIME    DEFAULT NULL,
    p_hora_fim_almoco    TIME    DEFAULT NULL,
    p_dias_semana        INTEGER[] DEFAULT '{1,2,3,4,5}',
    p_data_inicio        DATE    DEFAULT CURRENT_DATE,
    p_data_fim           DATE    DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_tt_jornada_fk = 1 AND (p_hora_inicio_almoco IS NULL OR p_hora_fim_almoco IS NULL) THEN
        RETURN '<error>Jornada Partida requer horas de início e fim de almoço</error>';
    END IF;

    IF p_op = 0 THEN
        UPDATE ts_rh_horario
        SET data_fim = p_data_inicio - INTERVAL '1 day'
        WHERE tb_user_fk = p_user_fk AND data_fim IS NULL;

        v_pk := fs_nextcode();
        INSERT INTO ts_rh_horario (
            pk, tb_user_fk, tt_jornada_fk, descr,
            hora_entrada, hora_saida, hora_inicio_almoco, hora_fim_almoco,
            dias_semana, data_inicio, data_fim
        ) VALUES (
            v_pk, p_user_fk, p_tt_jornada_fk, p_descr,
            p_hora_entrada, p_hora_saida, p_hora_inicio_almoco, p_hora_fim_almoco,
            p_dias_semana, p_data_inicio, p_data_fim
        );

    ELSIF p_op = 1 THEN
        SELECT pk INTO v_pk FROM ts_rh_horario WHERE pk = p_pk;
        IF v_pk IS NULL THEN
            RETURN '<error>Horário não encontrado: ' || p_pk || '</error>';
        END IF;

        UPDATE ts_rh_horario
        SET tt_jornada_fk      = p_tt_jornada_fk,
            descr              = p_descr,
            hora_entrada       = p_hora_entrada,
            hora_saida         = p_hora_saida,
            hora_inicio_almoco = p_hora_inicio_almoco,
            hora_fim_almoco    = p_hora_fim_almoco,
            dias_semana        = p_dias_semana,
            data_fim           = p_data_fim
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
