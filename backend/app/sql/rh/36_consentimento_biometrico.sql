-- backend/app/sql/rh/36_consentimento_biometrico.sql
-- Consentimento RGPD (art.9) para o registo biométrico facial.
-- Sem enrolamento sem consentimento activo — ver rh_face_service.py::enroll_face.
-- Executar DEPOIS de 22_face_recognition.sql

-- ─── 1. Tabela de consentimentos ──────────────────────────────────────────────
-- Registo probatório: nunca se apaga uma linha, só se revoga (ts_revogado_em),
-- mesmo princípio dos ledgers financeiros (tb_caixa) — corrige-se com um novo
-- estado, não com DELETE.

CREATE TABLE IF NOT EXISTS tb_rh_consentimento (
    pk               INTEGER      NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk       INTEGER      NOT NULL REFERENCES ts_client(pk) ON DELETE CASCADE,
    tipo             VARCHAR(30)  NOT NULL DEFAULT 'biometrico',
    versao_texto     VARCHAR(20)  NOT NULL,
    consentido       BOOLEAN      NOT NULL,
    ts_consentimento TIMESTAMP    NOT NULL DEFAULT NOW(),
    ip_origem        VARCHAR(45),
    revogado_em      TIMESTAMP,
    CONSTRAINT pk_tb_rh_consentimento PRIMARY KEY (pk)
);

-- Um consentimento "activo" por (utilizador, tipo) — usado para saber rapidamente
-- se pode prosseguir para o enrolamento sem percorrer o histórico completo.
CREATE INDEX IF NOT EXISTS idx_rh_consentimento_activo
    ON tb_rh_consentimento (tb_user_fk, tipo)
    WHERE revogado_em IS NULL;


-- ─── 2. Vista de leitura ───────────────────────────────────────────────────────

DROP VIEW IF EXISTS vbl_rh_consentimento;

CREATE VIEW vbl_rh_consentimento AS
SELECT
    co.pk,
    co.tb_user_fk,
    c.name              AS colaborador_nome,
    co.tipo,
    co.versao_texto,
    co.consentido,
    co.ts_consentimento,
    co.ip_origem,
    co.revogado_em
FROM tb_rh_consentimento co
JOIN ts_client c ON c.pk = co.tb_user_fk;


-- ─── 3. Função de escrita ──────────────────────────────────────────────────────
-- p_op = 0 → regista um novo consentimento (aceite explícito, versão do texto)
-- p_op = 1 → revoga o consentimento activo do tipo indicado (pedido de titular
--            ou apagamento biométrico) — não apaga a linha, marca revogado_em

CREATE OR REPLACE FUNCTION fbo_rh_consentimento(
    p_op            INTEGER,
    p_user_fk       INTEGER,
    p_tipo          VARCHAR DEFAULT 'biometrico',
    p_versao_texto  VARCHAR DEFAULT NULL,
    p_consentido    BOOLEAN DEFAULT NULL,
    p_ip            VARCHAR DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_pk INTEGER;
BEGIN
    IF p_op = 0 THEN
        IF p_versao_texto IS NULL OR p_consentido IS NOT TRUE THEN
            RETURN '<error>Consentimento explícito e versão do texto são obrigatórios</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_consentimento (
            pk, tb_user_fk, tipo, versao_texto, consentido, ip_origem
        ) VALUES (
            v_pk, p_user_fk, p_tipo, p_versao_texto, p_consentido, p_ip
        );

    ELSIF p_op = 1 THEN
        UPDATE tb_rh_consentimento
        SET revogado_em = NOW()
        WHERE tb_user_fk = p_user_fk AND tipo = p_tipo AND revogado_em IS NULL
        RETURNING pk INTO v_pk;

        IF v_pk IS NULL THEN
            RETURN '<error>Não existe consentimento activo para revogar</error>';
        END IF;

    ELSE
        RETURN '<error>Operação inválida</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$ LANGUAGE plpgsql;


-- ─── 4. Verificação ─────────────────────────────────────────────────────────

SELECT 'tb_rh_consentimento' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_rh_consentimento'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado
UNION ALL
SELECT 'vbl_rh_consentimento',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views WHERE table_name = 'vbl_rh_consentimento'
    ) THEN 'OK' ELSE 'FALHOU' END
UNION ALL
SELECT 'fbo_rh_consentimento',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'fbo_rh_consentimento'
    ) THEN 'OK' ELSE 'FALHOU' END;
