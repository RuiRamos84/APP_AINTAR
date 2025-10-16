# Sistema de Logging Centralizado

## 📋 Visão Geral

O sistema de logging foi redesenhado para ser **silencioso em produção** e **verboso apenas quando necessário**.

### Princípio Fundamental:
> **"Apenas erros em produção, debug quando solicitado"**

---

## 🎯 Níveis de Log

| Nível | Quando aparece | Uso |
|-------|----------------|-----|
| **ERROR** | ✅ Sempre | Erros críticos que precisam atenção |
| **WARNING** | ✅ Sempre | Situações anormais que podem causar problemas |
| **INFO** | ⚠️ Apenas com DEBUG_MODE=True | Informações úteis para desenvolvimento |
| **DEBUG** | ⚠️ Apenas com DEBUG_MODE=True | Detalhes técnicos e traces |

---

## ⚙️ Configuração

### 1. Variável de Ambiente

No ficheiro `.env.production`:

```bash
# Produção (padrão) - Apenas erros/warnings
DEBUG_MODE=False

# Desenvolvimento/Debug - Todos os logs
DEBUG_MODE=True
```

### 2. Ativar/Desativar Debug

**Modo Produção (Silencioso):**
```bash
DEBUG_MODE=False
```

**Modo Desenvolvimento (Verboso):**
```bash
DEBUG_MODE=True
```

Após alterar, **reiniciar o servidor**:
```bash
python run_waitress.py
```

---

## 📝 Como Usar no Código

### Importar o Logger

```python
from app.utils.logger import get_logger

logger = get_logger(__name__)
```

### Exemplos de Uso

```python
# ❌ ERRO: Sempre mostrado (produção + desenvolvimento)
logger.error("Erro ao processar documento: %s", error)
logger.error("CRÍTICO: Base de dados não responde!")

# ⚠️ WARNING: Sempre mostrado
logger.warning("Utilizador não encontrado, usando padrão")
logger.warning("Memória acima de 80%")

# ℹ️ INFO: Apenas se DEBUG_MODE=True
logger.info("Documento %s criado com sucesso", doc_id)
logger.info("Processando 150 ficheiros...")

# 🔍 DEBUG: Apenas se DEBUG_MODE=True
logger.debug("Valor da variável X: %s", x)
logger.debug("Query SQL: %s", query)
```

---

## ✅ Boas Práticas

### ✓ FAZER

```python
# Usar logs ERROR para falhas críticas
try:
    result = process_document(doc_id)
except Exception as e:
    logger.error(f"Erro ao processar documento {doc_id}: {str(e)}")
    raise

# Usar WARNING para situações anormais mas não críticas
if user is None:
    logger.warning(f"Utilizador {user_id} não encontrado, usando padrão")
    user = get_default_user()

# Usar INFO para operações importantes (apenas em debug)
logger.info(f"Documento {doc_id} criado com sucesso")

# Usar DEBUG para detalhes técnicos (apenas em debug)
logger.debug(f"Query executada: {query}")
```

### ✗ NÃO FAZER

```python
# ❌ NÃO usar INFO/DEBUG para erros
logger.info("Erro ao conectar à base de dados")  # ERRADO!
logger.error("Erro ao conectar à base de dados")  # CORRETO

# ❌ NÃO usar print()
print("Processando documento...")  # ERRADO!
logger.info("Processando documento...")  # CORRETO

# ❌ NÃO criar logs excessivos em loops
for doc in documents:  # ERRADO!
    logger.info(f"Processando {doc.id}")

# ✓ Melhor: log resumido
logger.info(f"Processando {len(documents)} documentos")  # CORRETO
```

---

## 📂 Logs de Ficheiro

### Ficheiro de Erros

Todos os **erros** são automaticamente guardados em:
```
backend/logs/errors.log
```

**Configuração:**
- Tamanho máximo: 10MB por ficheiro
- Rotação: 5 ficheiros backup
- Apenas erros (nível ERROR e acima)

---

## 🔧 Ficheiros Otimizados

Os seguintes ficheiros foram atualizados para usar o novo sistema:

### Core
- ✅ `app/__init__.py` - Inicialização da app
- ✅ `app/utils/logger.py` - Sistema de logging (NOVO)

### Services
- ✅ `app/services/documents_service.py`
- ✅ `app/socketio/socketio_events.py`

### Configuração
- ✅ `.env.production` - Variável DEBUG_MODE

---

## 🚀 Exemplo Completo

```python
from app.utils.logger import get_logger

logger = get_logger(__name__)

def add_document_step(data, pk, current_user):
    """Adicionar passo ao documento"""

    try:
        # Operação principal
        step_data = DocumentStepAdd.model_validate(data)

        # Log de info (apenas em DEBUG_MODE)
        logger.info(f"Adicionando passo ao documento {pk}")

        # Processar...
        result = process_step(step_data)

        # Log de debug (apenas em DEBUG_MODE)
        logger.debug(f"Resultado: {result}")

        return {'sucesso': 'Passo adicionado'}, 201

    except ValidationError as e:
        # Log de erro (sempre mostrado)
        logger.error(f"Erro de validação no documento {pk}: {str(e)}")
        raise

    except Exception as e:
        # Log de erro crítico (sempre mostrado)
        logger.error(f"Erro inesperado ao adicionar passo: {str(e)}", exc_info=True)
        raise
```

---

## 📊 Output Esperado

### Produção (DEBUG_MODE=False)
```
✓ Logging em modo PRODUÇÃO - Apenas erros/warnings serão registados
[ERROR] app.services.documents_service - Erro ao processar documento 123
[WARNING] app.socketio.socketio_events - Utilizador desconectado inesperadamente
```

### Desenvolvimento (DEBUG_MODE=True)
```
⚠️  DEBUG_MODE ATIVO - Logs verbosos habilitados
[INFO] app.services.documents_service:245 - Documento 123 criado com sucesso
[DEBUG] app.services.documents_service:250 - Query SQL: SELECT * FROM...
[INFO] app.socketio.socketio_events:85 - Notificação enviada para utilizador 456
[ERROR] app.services.documents_service:300 - Erro ao processar documento 789
```

---

## 🛠️ Troubleshooting

### Logs não aparecem

**Problema:** Logs INFO/DEBUG não aparecem no console

**Solução:**
1. Verificar `.env.production`:
   ```bash
   DEBUG_MODE=True
   ```
2. Reiniciar o servidor:
   ```bash
   python run_waitress.py
   ```

### Muitos logs em produção

**Problema:** Console poluído com muitas mensagens

**Solução:**
1. Definir `.env.production`:
   ```bash
   DEBUG_MODE=False
   ```
2. Reiniciar o servidor

### Erro "get_logger not found"

**Problema:** Import falha

**Solução:**
```python
# Usar import absoluto
from app.utils.logger import get_logger
```

---

## 📖 Referências

- **Ficheiro principal:** `backend/app/utils/logger.py`
- **Configuração:** `backend/.env.production`
- **Logs de erro:** `backend/logs/errors.log`

---

## 🎯 Checklist de Migração

Ao adicionar logging a um ficheiro novo:

- [ ] Importar o logger: `from app.utils.logger import get_logger`
- [ ] Criar instância: `logger = get_logger(__name__)`
- [ ] Substituir `print()` por `logger.info()` ou `logger.debug()`
- [ ] Usar `logger.error()` para todos os erros
- [ ] Usar `logger.warning()` para situações anormais
- [ ] Remover `current_app.logger` (se existir)
- [ ] Testar com DEBUG_MODE=False e DEBUG_MODE=True

---

**Última atualização:** 2025-01-16
**Autor:** Sistema de Logging Centralizado
