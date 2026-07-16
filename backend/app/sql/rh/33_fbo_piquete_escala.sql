-- backend/app/sql/rh/33_fbo_piquete_escala.sql
-- Substitui os INSERT/UPDATE directos em tb_rh_piquete_escala usados em
-- criar_escala_piquete/editar_escala_piquete (rh_service.py) por uma função
-- fbo_* própria, seguindo o padrão do resto do projeto (nunca escrever
-- directamente em tb_* a partir do backend). Replica 1:1 a lógica que
-- estava em Python, incluindo as mensagens de erro de duplicado.

CREATE OR REPLACE FUNCTION fbo_rh_piquete_escala(
    p_op          SMALLINT,   -- 0 = criar, 1 = editar
    p_pk          INTEGER,    -- NULL em p_op=0
    p_user_fk     INTEGER,
    p_data_inicio DATE,
    p_data_fim    DATE
)
RETURNS TEXT AS $$
DECLARE
    v_pk     INTEGER;
    v_exists INTEGER;
BEGIN
    IF p_op = 0 THEN
        SELECT 1 INTO v_exists FROM tb_rh_piquete_escala
        WHERE tb_user_fk = p_user_fk AND data_inicio = p_data_inicio;

        IF v_exists IS NOT NULL THEN
            RETURN '<error>Este colaborador já tem uma escala registada com esta data de início.</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_piquete_escala (
            pk, tb_user_fk, data_inicio, data_fim, confirmado, ts_estado_fk, gerado_auto
        ) VALUES (
            v_pk, p_user_fk, p_data_inicio, p_data_fim, FALSE, 1, FALSE
        );

    ELSIF p_op = 1 THEN
        SELECT 1 INTO v_exists FROM tb_rh_piquete_escala
        WHERE tb_user_fk = p_user_fk AND data_inicio = p_data_inicio AND pk != p_pk;

        IF v_exists IS NOT NULL THEN
            RETURN '<error>Este colaborador já tem outra escala registada com esta data de início.</error>';
        END IF;

        UPDATE tb_rh_piquete_escala
        SET tb_user_fk     = p_user_fk,
            data_inicio    = p_data_inicio,
            data_fim       = p_data_fim,
            confirmado     = FALSE,
            ts_confirmacao = NULL,
            ts_estado_fk   = 1,
            gerado_auto    = FALSE
        WHERE pk = p_pk;

        IF NOT FOUND THEN
            RETURN '<error>Escala não encontrada: ' || p_pk || '</error>';
        END IF;
        v_pk := p_pk;
    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- Verificação
SELECT 'fbo_rh_piquete_escala' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fbo_rh_piquete_escala'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
