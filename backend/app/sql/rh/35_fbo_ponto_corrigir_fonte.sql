-- backend/app/sql/rh/35_fbo_ponto_corrigir_fonte.sql
-- fbo_rh_ponto_corrigir passa a aceitar p_fonte (default 'correcao', mantém
-- compatibilidade com as chamadas antigas) para distinguir auto-correcao do
-- próprio colaborador (esquecimentos/enganos, sempre com justificação nas
-- observações) de correcao feita por admin RH/supervisor em nome de outrem.
--
-- DROP explícito da assinatura de 3 argumentos antes do CREATE — adicionar
-- um parâmetro, mesmo com DEFAULT, cria uma nova sobrecarga em vez de
-- substituir a função existente (lição já documentada no Vault a propósito
-- de fbo_rh_colaborador: "confirmar sempre a assinatura viva na BD antes de
-- a alterar" — aqui aplica-se ao contrário: garantir que NÃO fica uma
-- sobrecarga zombie ao adicionar um parâmetro).

DROP FUNCTION IF EXISTS fbo_rh_ponto_corrigir(INTEGER, TIMESTAMP, TEXT);

CREATE OR REPLACE FUNCTION fbo_rh_ponto_corrigir(
    p_pk         INTEGER,
    p_ts_registo TIMESTAMP,
    p_notas      TEXT DEFAULT NULL,
    p_fonte      VARCHAR DEFAULT 'correcao'
)
RETURNS TEXT AS $$
BEGIN
    UPDATE tb_rh_ponto
    SET ts_registo = p_ts_registo,
        fonte      = p_fonte,
        notas      = COALESCE(p_notas, notas)
    WHERE pk = p_pk;

    IF NOT FOUND THEN
        RETURN '<error>Registo não encontrado: ' || p_pk || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || p_pk;
END;
$$ LANGUAGE plpgsql;


-- Verificação
SELECT 'fbo_rh_ponto_corrigir (4 args, com p_fonte)' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'fbo_rh_ponto_corrigir'
          AND pg_get_function_identity_arguments(oid) ILIKE '%fonte%'
    ) THEN 'OK' ELSE 'FALHOU' END AS resultado;
