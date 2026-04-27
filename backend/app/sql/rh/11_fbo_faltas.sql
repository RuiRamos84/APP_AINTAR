-- backend/app/sql/rh/11_fbo_faltas.sql

CREATE OR REPLACE FUNCTION fbo_rh_faltas(
    p_op                 INTEGER,
    p_pk                 INTEGER,
    p_user_fk            INTEGER,
    p_tt_tipo_falta_fk   INTEGER,
    p_data               DATE,
    p_justificativo_path VARCHAR DEFAULT NULL,
    p_notas              TEXT DEFAULT NULL,
    p_comunicado_por     INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN
        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk = p_user_fk
              AND ts_estado_fk = 3
              AND p_data BETWEEN data_inicio AND data_fim
        ) THEN
            RETURN '<error>Colaborador tem férias aprovadas nesta data</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_faltas (
            pk, tb_user_fk, tt_tipo_falta_fk, data,
            justificativo_path, notas, comunicado_por
        ) VALUES (
            v_pk, p_user_fk, p_tt_tipo_falta_fk, p_data,
            p_justificativo_path, p_notas, p_comunicado_por
        );

    ELSIF p_op = 1 THEN
        SELECT pk INTO v_pk FROM tb_rh_faltas WHERE pk = p_pk AND ts_estado_fk IN (1, 2);
        IF v_pk IS NULL THEN
            RETURN '<error>Falta não encontrada ou já aprovada/rejeitada</error>';
        END IF;

        UPDATE tb_rh_faltas
        SET justificativo_path = COALESCE(p_justificativo_path, justificativo_path),
            tt_tipo_falta_fk   = COALESCE(NULLIF(p_tt_tipo_falta_fk, 0), tt_tipo_falta_fk),
            notas              = COALESCE(p_notas, notas)
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;
