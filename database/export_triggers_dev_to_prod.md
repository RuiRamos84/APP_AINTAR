# Exportar Triggers de DEV para PROD

## Problema
A view `vbf_document_step` em PROD não tem triggers INSTEAD OF INSERT, causando erro ao criar documentos.

## Solução: Replicar triggers de DEV para PROD

### Opção 1: Usar pg_dump (RECOMENDADO)

```bash
# 1. Exportar apenas os triggers da view vbf_document_step de DEV
pg_dump -h localhost -U aintar -d aintar_server \
  --schema-only \
  --table=vbf_document_step \
  --no-owner \
  --no-privileges \
  -f triggers_vbf_document_step_dev.sql

# 2. Editar o ficheiro triggers_vbf_document_step_dev.sql
# - Remover a criação da view (manter apenas os triggers)
# - Verificar se os nomes das funções trigger estão corretos

# 3. Aplicar em PROD
psql -h app.aintar.pt -U aintar_prod -d aintar_server \
  -f triggers_vbf_document_step_dev.sql
```

### Opção 2: Consulta SQL Manual

**Passo 1: Executar em DEV**

Abre o PgAdmin/DBeaver conectado a **DEV** e executa:

```sql
-- Ver os triggers da view
SELECT pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'vbf_document_step'::regclass;

-- Ver as funções trigger
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
WHERE t.tgrelid = 'vbf_document_step'::regclass;
```

**Passo 2: Copiar resultado e aplicar em PROD**

Copia os resultados das queries acima e executa em **PROD**.

### Opção 3: Criar trigger manualmente (se não existir em DEV)

Se em DEV também não tiver triggers, precisas criar:

```sql
-- Função trigger para INSERT
CREATE OR REPLACE FUNCTION aintar_server.vbf_document_step_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO tb_document_step (
        pk, tb_document, what, who, data, memo,
        hist_client, hist_time
    )
    VALUES (
        NEW.pk,
        NEW.tb_document,
        NEW.what,
        NEW.who,
        COALESCE(NEW.data, current_timestamp),
        NEW.memo,
        COALESCE(NEW.hist_client, fs_client()),
        COALESCE(NEW.hist_time, current_timestamp)
    );
    RETURN NEW;
END;
$function$;

-- Trigger INSTEAD OF INSERT
CREATE TRIGGER vbf_document_step_instead_insert
    INSTEAD OF INSERT ON vbf_document_step
    FOR EACH ROW
    EXECUTE FUNCTION aintar_server.vbf_document_step_insert();
```

### Verificação

Depois de aplicar, verifica se funcionou:

```sql
-- Em PROD, verificar se o trigger existe
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vbf_document_step';

-- Testar insert simples
INSERT INTO vbf_document_step (pk, tb_document, what, who, memo)
VALUES (nextval('sq_codes'), 999999, 1, 1, 'Teste');

-- Se não der erro, rollback do teste
ROLLBACK;
```

## Notas Importantes

1. ⚠️ **Backup antes de aplicar em PROD**
2. ✅ A view em DEV provavelmente tem triggers que permitem INSERT/UPDATE/DELETE
3. ✅ Precisas replicar exatamente a mesma estrutura para PROD
4. ✅ Se a função `fbf_document()` em DEV também usa a view, então DEV tem triggers funcionais

## Próximos Passos

Depois de aplicar os triggers:
1. Testar criação de documento em PROD
2. Verificar logs para confirmar sucesso
3. Remover o ficheiro `fix_fbf_document_insert_prod.sql` (não será necessário)
