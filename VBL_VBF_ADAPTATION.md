# 🔄 Sistema de Emissões - Adaptação VBL/VBF

**Data:** 2025-01-21
**Status:** ✅ Completo

---

## 📋 Estrutura da Base de Dados

### **Tabelas Base (ts_)**
```sql
ts_lettertype     -- Tipos: Ofício, Notificação, Declaração, etc
ts_letterstatus   -- Status: draft, issued, signed, archived, cancelled
```

### **Tabelas de Dados (tb_)**
```sql
tb_letter_template  -- Templates de emissões
tb_letter           -- Emissões (antigas letterstores)
```

### **Views de Leitura (vbl_)**
```sql
vbl_lettertype         -- Tipos (read-only)
vbl_letterstatus       -- Status (read-only)
vbl_letter_template    -- Templates com joins
vbl_letter             -- Emissões com joins completos
```

### **Views Editáveis (vbf_)**
```sql
vbf_letter_template    -- CRUD de templates
vbf_letter             -- CRUD de emissões
```

---

## 🏗️ Arquitetura Backend

### **Models** ([letter_unified.py](backend/app/models/letter_unified.py))

```python
# Read-Only (VBL)
LetterType             → vbl_lettertype
LetterStatus           → vbl_letterstatus
LetterTemplateVBL      → vbl_letter_template
LetterVBL              → vbl_letter

# Editáveis (VBF)
LetterTemplateVBF      → vbf_letter_template
LetterVBF              → vbf_letter
```

### **Service** ([letter_unified_service.py](backend/app/services/letter_unified_service.py))

```python
LetterUnifiedService
├── get_letter_types()          # Lista tipos
├── get_letter_statuses()       # Lista status
├── create_template()           # Cria via VBF
├── list_templates()            # Lista via VBL
├── update_template()           # Atualiza via VBF
├── create_letter()             # Cria via VBF
├── list_letters()              # Lista via VBL
└── generate_next_number()      # Numeração automática
```

### **Routes** ([letter_unified_routes.py](backend/app/routes/letter_unified_routes.py))

```
GET    /api/v1/emissions/types              ← Tipos de documentos
GET    /api/v1/emissions/templates          ← Listar templates
POST   /api/v1/emissions/templates          ← Criar template
GET    /api/v1/emissions/templates/:id      ← Obter template
PUT    /api/v1/emissions/templates/:id      ← Atualizar template
DELETE /api/v1/emissions/templates/:id      ← Desativar template
GET    /api/v1/emissions/                   ← Listar emissões
POST   /api/v1/emissions/                   ← Criar emissão
GET    /api/v1/emissions/:id                ← Obter emissão
GET    /api/v1/emissions/health             ← Health check
```

---

## 🔑 Principais Diferenças vs Versão Anterior

| Aspecto | Versão Anterior | Versão VBL/VBF |
|---------|-----------------|----------------|
| **Tipos** | `tb_document_type` | `ts_lettertype` |
| **Campo Tipo** | `tb_document_type` (FK) | `ts_lettertype` (FK) |
| **Status** | `status` (string) | `ts_letterstatus` (FK) |
| **Metadata** | `metadata` (JSONB) | `metadata` (JSONB) |
| **Audit** | `created_by`, `created_at` | `hist_client`, `hist_time` |
| **Views** | Não usava | **VBL** (leitura) + **VBF** (edição) |

---

## 📊 Mapeamento de Campos

### **Templates**

| Campo Antigo | Campo Novo | Tipo |
|--------------|------------|------|
| `tb_document_type` | `ts_lettertype` | Integer (FK) |
| `name` | `name` | String |
| `body` | `body` | Text |
| `meta_data` | `metadata` | JSONB |
| `created_by` | `hist_client` | String |
| `created_at` | `hist_time` | DateTime |

### **Emissões**

| Campo Antigo | Campo Novo | Tipo |
|--------------|------------|------|
| `tb_emission_template` | `tb_letter_template` | Integer (FK) |
| `tb_document_type` | *(via template)* | - |
| `status` (string) | `ts_letterstatus` | Integer (FK) |
| `emission_number` | `emission_number` | String |
| `subject` | `subject` | String |
| `recipient_data` | `recipient_data` | JSONB |
| `custom_data` | `custom_data` | JSONB |
| `created_by` | `hist_client` | String |
| `signed_by` | `sign_client` | String |
| `signed_at` | `sign_time` | DateTime |

---

## 🔄 Fluxo de Dados

### **Leitura (GET)**
```
Frontend → API Route → Service → VBL View → Response
```

### **Escrita (POST/PUT)**
```
Frontend → API Route → Service → VBF View → tb_* → Response via VBL
```

### **Exemplo Prático:**

#### Criar Template:
```python
# 1. Service usa VBF para escrever
template_vbf = LetterTemplateVBF(
    ts_lettertype=1,  # FK para ts_lettertype
    name="Ofício Padrão",
    body="...",
    hist_client=current_user
)
db.session.add(template_vbf)
db.session.commit()

# 2. Retorna VBL para leitura
return LetterTemplateVBL.query.get(template_vbf.pk)
```

---

## ✅ Como Testar

### **1. Reiniciar Backend**
```powershell
# Parar (Ctrl+C)

# Reiniciar
cd C:\Users\rui.ramos\Desktop\APP\backend
$env:FLASK_ENV="development"
python run_waitress.py
```

### **2. Testar API - Tipos**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/v1/emissions/types
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {"pk": 1, "acron": "OFI", "name": "Ofício", "description": "..."},
    {"pk": 2, "acron": "NOT", "name": "Notificação", "description": "..."},
    ...
  ],
  "count": 5
}
```

### **3. Criar Template**
```bash
curl -X POST http://localhost:5000/api/v1/emissions/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ts_lettertype": 1,
    "name": "Ofício Teste",
    "body": "Exmo. Senhor,\n\nPor meio do presente..."
  }'
```

### **4. Testar Frontend**
```
http://localhost:3000/emissions
```

---

## 🐛 Troubleshooting

### Erro: "relation vbl_lettertype does not exist"
```sql
-- Verificar se views existem
SELECT viewname FROM pg_views
WHERE viewname LIKE 'vbl_%' OR viewname LIKE 'vbf_%';
```

### Erro: "column ts_lettertype does not exist"
```sql
-- Verificar estrutura
\d vbf_letter_template
\d vbl_letter_template
```

### Erro: "status draft not found"
```sql
-- Verificar status
SELECT * FROM vbl_letterstatus;

-- Deve ter:
-- pk | value
-- 1  | draft
-- 2  | issued
-- 3  | signed
-- 4  | archived
-- 5  | cancelled
```

---

## 📈 Próximos Passos

1. ✅ Backend adaptado para VBL/VBF
2. ⏳ Frontend ajustar chamadas API
3. ⏳ Testar CRUD completo
4. ⏳ Geração de PDFs
5. ⏳ Assinatura digital

---

## 📞 Suporte

**Ficheiros criados:**
- `backend/app/models/letter_unified.py`
- `backend/app/services/letter_unified_service.py`
- `backend/app/routes/letter_unified_routes.py`
- `backend/app/__init__.py` (atualizado)

**Blueprint registado:** `letter_unified_bp`
**URL Base:** `/api/v1/emissions`
**Permissão:** 220

---

**Adaptação concluída com sucesso!** ✅
