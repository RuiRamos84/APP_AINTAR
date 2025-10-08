-- =====================================================
-- Migração: Criar tabela de auditoria de ofícios
-- Data: 2025-01-06
-- Autor: Claude (Sistema de Auditoria - FASE 2)
-- =====================================================

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS tb_letter_audit (
    pk SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_description VARCHAR(255),
    letter_id INTEGER REFERENCES tb_letter(pk) ON DELETE SET NULL,
    letterstore_id INTEGER REFERENCES tb_letterstore(pk) ON DELETE SET NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_letter_audit_user
    ON tb_letter_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_letter_audit_action
    ON tb_letter_audit(action);

CREATE INDEX IF NOT EXISTS idx_letter_audit_timestamp
    ON tb_letter_audit(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_letter_audit_letter
    ON tb_letter_audit(letter_id)
    WHERE letter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_letter_audit_letterstore
    ON tb_letter_audit(letterstore_id)
    WHERE letterstore_id IS NOT NULL;

-- Índice GIN para pesquisa no JSON
CREATE INDEX IF NOT EXISTS idx_letter_audit_details
    ON tb_letter_audit USING GIN(details);

-- Índice composto para consultas por utilizador e data
CREATE INDEX IF NOT EXISTS idx_letter_audit_user_timestamp
    ON tb_letter_audit(user_id, timestamp DESC);

-- Comentários na tabela
COMMENT ON TABLE tb_letter_audit IS
    'Auditoria completa de ações realizadas no módulo de ofícios';

COMMENT ON COLUMN tb_letter_audit.pk IS
    'Chave primária - ID único do registro de auditoria';

COMMENT ON COLUMN tb_letter_audit.user_id IS
    'Username do utilizador que realizou a ação';

COMMENT ON COLUMN tb_letter_audit.action IS
    'Código da ação realizada (ex: TEMPLATE_CREATE, LETTER_GENERATE)';

COMMENT ON COLUMN tb_letter_audit.action_description IS
    'Descrição legível da ação';

COMMENT ON COLUMN tb_letter_audit.letter_id IS
    'ID do template de ofício (se aplicável)';

COMMENT ON COLUMN tb_letter_audit.letterstore_id IS
    'ID do ofício emitido (se aplicável)';

COMMENT ON COLUMN tb_letter_audit.details IS
    'Dados adicionais da ação em formato JSON (ex: campos alterados, valores anteriores)';

COMMENT ON COLUMN tb_letter_audit.ip_address IS
    'Endereço IP de onde a ação foi realizada';

COMMENT ON COLUMN tb_letter_audit.user_agent IS
    'User agent do browser (identifica dispositivo e navegador)';

COMMENT ON COLUMN tb_letter_audit.timestamp IS
    'Data e hora da ação';

-- View para facilitar consultas comuns
CREATE OR REPLACE VIEW vbl_letter_audit_summary AS
SELECT
    a.pk,
    a.user_id,
    a.action,
    a.action_description,
    a.timestamp,
    l.name as template_name,
    ls.regnumber as letter_number,
    ls.descr as letter_description,
    a.details
FROM tb_letter_audit a
LEFT JOIN tb_letter l ON a.letter_id = l.pk
LEFT JOIN tb_letterstore ls ON a.letterstore_id = ls.pk
ORDER BY a.timestamp DESC;

COMMENT ON VIEW vbl_letter_audit_summary IS
    'View simplificada de auditoria com informações relacionadas';

-- Função para limpar logs antigos (manutenção)
CREATE OR REPLACE FUNCTION clean_old_audit_logs(months_old INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tb_letter_audit
    WHERE timestamp < NOW() - (months_old || ' months')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clean_old_audit_logs IS
    'Remove logs de auditoria com mais de X meses (default: 12)';

-- Trigger para garantir que detalhes sensíveis não são registados
CREATE OR REPLACE FUNCTION sanitize_audit_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Remover campos sensíveis do JSON details se existirem
    IF NEW.details IS NOT NULL THEN
        NEW.details = NEW.details - 'password' - 'token' - 'secret';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sanitize_audit_details
    BEFORE INSERT OR UPDATE ON tb_letter_audit
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_audit_details();

COMMENT ON TRIGGER trg_sanitize_audit_details ON tb_letter_audit IS
    'Remove automaticamente dados sensíveis dos logs de auditoria';

-- Inserir registros iniciais (para testes)
INSERT INTO tb_letter_audit (pk, user_id, action, action_description, details, timestamp)
VALUES
    (fs_nextcode(), 'system', 'SYSTEM_INIT', 'Sistema de auditoria inicializado',
     '{"version": "1.0", "migration": "create_letter_audit_table"}'::jsonb, NOW())
ON CONFLICT DO NOTHING;

-- Verificação de sucesso
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_letter_audit') THEN
        RAISE NOTICE '✅ Tabela tb_letter_audit criada com sucesso!';
        RAISE NOTICE '✅ Índices criados com sucesso!';
        RAISE NOTICE '✅ View vbl_letter_audit_summary criada!';
        RAISE NOTICE '✅ Triggers e funções criadas!';
    ELSE
        RAISE EXCEPTION '❌ Erro ao criar tabela tb_letter_audit';
    END IF;
END $$;
