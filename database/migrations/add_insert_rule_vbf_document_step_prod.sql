-- =====================================================
-- Adicionar RULE para permitir INSERT na view vbf_document_step
-- Aplicar apenas em PROD (se DEV não tiver, aplicar também)
-- =====================================================

-- Remover rule existente se houver (prevenir erro)
DROP RULE IF EXISTS vbf_document_step_insert ON aintar_server.vbf_document_step;

-- Criar RULE para INSERT
-- Esta rule redireciona o INSERT da view para a tabela base tb_document_step
CREATE OR REPLACE RULE vbf_document_step_insert AS
    ON INSERT TO aintar_server.vbf_document_step
    DO INSTEAD
        INSERT INTO aintar_server.tb_document_step (
            pk,
            tb_document,
            when_start,
            when_stop,
            what,
            who,
            descr,
            memo,
            ord,
            hist_client,
            hist_time
        )
        VALUES (
            COALESCE(NEW.pk, nextval('sq_codes')),
            NEW.tb_document,
            COALESCE(NEW.when_start, current_timestamp),
            NEW.when_stop,
            NEW.what,
            NEW.who,
            NEW.descr,
            NEW.memo,
            NEW.ord,
            fs_client(),
            current_timestamp
        );

-- Verificar se a RULE foi criada
SELECT
    'RULE CREATED' as status,
    rulename,
    ev_type,
    is_instead
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
WHERE c.relname = 'vbf_document_step'
  AND r.rulename = 'vbf_document_step_insert';

-- Testar insert (ROLLBACK no final)
BEGIN;
    INSERT INTO vbf_document_step (pk, tb_document, what, who, memo)
    VALUES (nextval('sq_codes'), 999999, 1, 1, 'Teste de insert');

    SELECT 'TEST INSERT' as status, 'SUCCESS' as result;
ROLLBACK;

-- Comentário
COMMENT ON RULE vbf_document_step_insert ON aintar_server.vbf_document_step IS
'Rule para permitir INSERT na view vbf_document_step. Redireciona para tb_document_step.';
