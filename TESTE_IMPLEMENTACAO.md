# ✅ Checklist de Testes - Módulo de Ofícios

## 🧪 Como Testar as Novas Funcionalidades

### 1️⃣ **Sistema de Variáveis Jinja2**

**Teste 1: Criar Template com Variáveis**
1. Aceder: **Ofícios → Modelos → Criar Novo Modelo**
2. Clicar no botão **"Inserir Variável"** (ícone de documento)
3. Selecionar variável: `NOME`
4. Verificar que aparece: `{{ NOME }}`
5. Adicionar texto: "Exmo. Sr. {{ NOME }}, vimos por este meio..."
6. Salvar template

**Teste 2: Validar Template**
```bash
# Via API (Postman/Insomnia)
POST /api/v1/letters/validate-template
{
  "template": "Exmo. Sr. {{ NOME }}, {{ MORADA }}"
}

# Resposta esperada:
{
  "is_valid": true,
  "variables_used": ["NOME", "MORADA"],
  "unknown_variables": [],
  "errors": []
}
```

---

### 2️⃣ **Preview de Ofícios**

**Teste 1: Preview via Interface** ✅ (JÁ TESTADO - FUNCIONA!)
1. Aceder: **Ofícios → Emissão**
2. Selecionar template
3. Preencher dados do destinatário
4. Clicar **"Pré-visualizar"**
5. Modal deve abrir com PDF

**Resultado Esperado:**
- ✅ Template renderizado com sucesso
- ✅ Variáveis substituídas corretamente
- ✅ PDF exibido no modal
- ✅ Botão "Baixar PDF" funcional

**Erro Corrigido:**
- ❌ `'BaseLetterTemplate' object has no attribute '_pageCount'`
- ✅ **RESOLVIDO** - Adicionado `afterFlowable` e `getattr`

---

### 3️⃣ **Editor Rico (Tiptap)**

**Teste 1: Formatar Texto**
1. Criar/Editar modelo de ofício
2. Testar botões da toolbar:
   - **Negrito** - Selecionar texto e clicar "B"
   - **Itálico** - Selecionar texto e clicar "I"
   - **Lista** - Clicar no ícone de lista

**Teste 2: Inserir Variável via Menu**
1. Clicar botão **"Inserir Variável"**
2. Menu deve abrir com categorias:
   - Destinatário
   - Pedido
   - Sistema
3. Selecionar uma variável
4. Variável deve aparecer no editor como `{{ VARIAVEL }}`

---

### 4️⃣ **Sistema de Numeração**

**Teste 1: Gerar Ofício**
1. Emitir um ofício normal
2. Verificar número gerado: `OF-2025.S.OFI.000XXX`

**Teste 2: Estatísticas via API**
```bash
GET /api/v1/admin/numbering/stats/2025

# Resposta esperada:
{
  "year": 2025,
  "total": 150,
  "by_department": {
    "S": 100,
    "A": 50
  },
  "by_type": {
    "OFI": 120,
    "COM": 30
  }
}
```

**Teste 3: Validar Número**
```bash
POST /api/v1/admin/numbering/validate
{
  "number": "OF-2025.S.OFI.000001"
}

# Resposta esperada:
{
  "valid": true,
  "parsed": {
    "prefix": "OF",
    "year": 2025,
    "department": "S",
    "type": "OFI",
    "sequence": 1
  }
}
```

---

### 5️⃣ **Gestão de Ficheiros**

**Teste 1: Estatísticas de Armazenamento**
```bash
GET /api/v1/admin/storage/stats

# Resposta esperada:
{
  "temp_files": 45,
  "temp_size_mb": 120.5,
  "letters_count": 350,
  "letters_size_mb": 850.2,
  "total_size_mb": 970.7
}
```

**Teste 2: Limpeza de Temporários (Dry Run)**
```bash
POST /api/v1/admin/cleanup/temp
{
  "days_old": 7,
  "dry_run": true
}

# Resposta esperada:
{
  "scanned": 150,
  "removed": 12,
  "freed_mb": 45.2,
  "files": ["preview_xxx.pdf", "temp_yyy.pdf"]
}
```

**Teste 3: Organizar Ofícios**
```bash
POST /api/v1/admin/letters/organize

# Resposta esperada:
{
  "organized": 25,
  "errors": 0
}
```

---

## 🐛 **Problemas Conhecidos e Soluções**

### ✅ RESOLVIDO: Preview com erro `_pageCount`
**Erro:**
```
ERROR:root:Erro ao gerar preview: 'BaseLetterTemplate' object has no attribute '_pageCount'
```

**Solução Aplicada:**
```python
# Adicionado em BaseLetterTemplate.build_letter()
self._pageCount = 0

# Adicionado método afterFlowable()
def afterFlowable(self, flowable):
    self._pageCount = self.page

# Modificado _draw_footer()
total_pages = getattr(self, '_pageCount', doc.page)
```

---

## 📊 **Verificação de Logs**

### Logs de Sucesso Esperados:

```
DEBUG:app.services.template_service:Template renderizado com sucesso. Contexto: [...]
INFO:app.services.letter_numbering_service:Número de ofício gerado: OF-2025.S.OFI.000123
INFO:app.services.file_cleanup_service:Cleanup completed: 12 files removed, 45.20 MB freed
```

### Logs de Debug Úteis:

```python
# Ativar logs detalhados
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 🎯 **Testes de Integração**

### Fluxo Completo: Criar e Emitir Ofício

1. **Criar Template:**
   - Nome: "Autorização de Ligação"
   - Corpo com variáveis: `{{ NOME }}`, `{{ MORADA }}`, `{{ NUMERO_PEDIDO }}`

2. **Preview:**
   - Preencher dados
   - Verificar preview
   - Confirmar variáveis substituídas

3. **Emitir:**
   - Gerar ofício final
   - Verificar número gerado
   - Download do PDF

4. **Verificar Armazenamento:**
   - Ficheiro salvo em `files/letters/`
   - Registro em `tb_letterstore`
   - Preview temporário removido

---

## ✅ **Critérios de Aceitação**

### FASE 1 ✓
- [x] Templates HTML/DOCX depreciados
- [x] Sistema Jinja2 funcional
- [x] Preview funcional
- [x] Variáveis substituídas corretamente

### FASE 2 ✓
- [x] Editor rico com toolbar
- [x] Inserção de variáveis via menu
- [x] Numeração centralizada
- [x] Cleanup de ficheiros
- [x] Estatísticas de armazenamento

### Pendente
- [ ] Sistema de auditoria
- [ ] Assinatura digital (CMD/CC)
- [ ] Notificações
- [ ] UI/UX melhorias

---

## 🚀 **Próximos Testes**

Após correção do erro `_pageCount`:
1. ✅ Testar preview novamente
2. Emitir ofício real
3. Verificar numeração
4. Testar todas as variáveis disponíveis
5. Performance com múltiplos utilizadores

---

**Data:** 2025-01-06
**Status:** Preview corrigido - Pronto para testes completos! ✅
