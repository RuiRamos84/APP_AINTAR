# 📋 Sistema Unificado de Emissões - Guia de Migração

**Versão:** 1.0
**Data:** 2025-01-21
**Status:** Pronto para implementação

---

## 🎯 Objetivo

Evoluir o módulo de **Ofícios** para um **Sistema Centralizado de Emissões** que gere:

- ✅ **Ofícios** (OFI)
- ✅ **Notificações** (NOT)
- ✅ **Declarações** (DEC)
- ✅ **Informações** (INF)
- ✅ **Deliberações** (DEL)

---

## 📦 Estrutura Implementada

### **Backend**

```
backend/
├── migrations/
│   ├── create_unified_emissions_system.sql  ← Nova estrutura BD
│   └── migrate_existing_data.sql            ← Script migração dados
├── app/
│   ├── models/
│   │   └── emission.py                      ← Novos models (DocumentType, EmissionTemplate, Emission, EmissionAudit)
│   ├── services/
│   │   └── emissions/
│   │       ├── __init__.py
│   │       ├── core_service.py              ← CRUD genérico
│   │       └── numbering_service.py         ← Numeração multi-tipo
│   └── routes/
│       └── emission_routes.py               ← API unificada /emissions/*
```

### **Frontend**

```
frontend/src/
├── components/
│   └── Emissions/
│       └── TypeSelector.jsx                 ← Seletor visual de tipos
└── services/
    └── emission_service.js                  ← Cliente API
```

---

## 🚀 Plano de Implementação (4 Fases)

### **FASE 1: Criar Nova Estrutura BD** ⏱️ 30min

#### Passo 1.1: Executar migration principal

```bash
psql -U <user> -d <database> -f backend/migrations/create_unified_emissions_system.sql
```

**Cria:**
- ✅ `tb_document_type` (5 tipos pré-carregados)
- ✅ `tb_emission_template` (substitui `tb_letter`)
- ✅ `tb_emission` (substitui `tb_letterstore`)
- ✅ `tb_emission_audit` (nova auditoria)
- ✅ Views de compatibilidade
- ✅ Triggers e funções

#### Passo 1.2: Verificar criação

```sql
SELECT * FROM tb_document_type ORDER BY pk;
```

**Resultado esperado:**
| pk | code | name | prefix |
|----|------|------|--------|
| 1  | OFI  | Ofício | OF |
| 2  | NOT  | Notificação | NT |
| 3  | DEC  | Declaração | DC |
| 4  | INF  | Informação | INF |
| 5  | DEL  | Deliberação | DL |

---

### **FASE 2: Migrar Dados Existentes** ⏱️ 15min

#### Passo 2.1: Executar migration de dados

```bash
psql -U <user> -d <database> -f backend/migrations/migrate_existing_data.sql
```

**Migra:**
- ✅ `tb_letter` → `tb_emission_template`
- ✅ `tb_letterstore` → `tb_emission`
- ✅ `tb_letter_audit` → `tb_emission_audit`

#### Passo 2.2: Validar migração

```sql
-- Verificar templates
SELECT COUNT(*) as templates FROM tb_emission_template;

-- Verificar emissões
SELECT COUNT(*) as emissions FROM tb_emission;

-- Ver primeiras emissões migradas
SELECT emission_number, subject, status FROM tb_emission ORDER BY pk LIMIT 10;
```

#### Passo 2.3: Verificar views de compatibilidade

```sql
-- View antiga deve funcionar
SELECT * FROM vbl_letter_compatibility LIMIT 5;

-- View nova
SELECT * FROM vbl_emission LIMIT 5;
```

---

### **FASE 3: Registar Backend** ⏱️ 15min

#### Passo 3.1: Registar novo blueprint

Editar `backend/app/__init__.py`:

```python
# Importar novo blueprint
from app.routes.emission_routes import emission_bp

# Registar (DEPOIS do blueprint de letters)
app.register_blueprint(emission_bp)
```

#### Passo 3.2: Importar models no shell

Editar `backend/app/__init__.py` (se usar flask shell):

```python
from app.models.emission import DocumentType, EmissionTemplate, Emission, EmissionAudit
```

#### Passo 3.3: Reiniciar backend

```bash
# Desenvolvimento
python backend/run.py

# Produção
systemctl restart app-backend
```

#### Passo 3.4: Testar API

```bash
# Health check
curl http://localhost:5000/emissions/health

# Listar tipos
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/emissions/types

# Listar templates
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/emissions/templates
```

**Resposta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "pk": 1,
      "code": "OFI",
      "name": "Ofício",
      "prefix": "OF",
      "active": 1
    },
    ...
  ],
  "count": 5
}
```

---

### **FASE 4: Frontend (Opcional - Progressive)** ⏱️ 2-3 dias

Esta fase pode ser feita **gradualmente** enquanto o sistema antigo continua funcionando.

#### Opção A: Usar novo sistema imediatamente

1. Criar página `EmissionHub.jsx`
2. Integrar `TypeSelector` component
3. Adaptar forms existentes
4. Testar end-to-end

#### Opção B: Manter dual-mode (RECOMENDADO)

1. **Semanas 1-2:** Testar novo sistema em ambiente dev
2. **Semana 3:** Deploy paralelo (ambos funcionam)
3. **Semana 4:** Migrar utilizadores gradualmente
4. **Semana 5+:** Deprecar sistema antigo

---

## 🔄 Compatibilidade com Sistema Antigo

### **Backend - Rotas antigas MANTIDAS**

```
✅ /letters/*            ← Funciona (usa tb_letter)
✅ /letterstores/*       ← Funciona (usa tb_letterstore)
🆕 /emissions/*          ← Novo sistema
```

### **Views de compatibilidade**

Código legacy pode continuar usando:

```python
# Antigo (continua funcionando)
Letter.query.all()
LetterStore.query.all()

# Novo
EmissionTemplate.query.all()
Emission.query.all()
```

### **Migration reversal (se necessário)**

```sql
-- CUIDADO: Só usar se precisar reverter!
DROP TABLE IF EXISTS tb_emission_audit CASCADE;
DROP TABLE IF EXISTS tb_emission CASCADE;
DROP TABLE IF EXISTS tb_emission_template CASCADE;
DROP TABLE IF EXISTS tb_document_type CASCADE;
```

---

## ✅ Checklist de Validação

### **Fase 1 - Estrutura BD**
- [ ] Tabelas criadas sem erros
- [ ] 5 tipos de documentos inseridos
- [ ] Views criadas com sucesso
- [ ] Triggers ativados

### **Fase 2 - Migração de Dados**
- [ ] Todos templates migrados (count igual)
- [ ] Todas emissões migradas (count igual)
- [ ] Audit logs migrados
- [ ] Views de compatibilidade funcionam

### **Fase 3 - Backend**
- [ ] Blueprint registado
- [ ] API `/emissions/health` responde 200
- [ ] API `/emissions/types` retorna 5 tipos
- [ ] API `/emissions/templates` retorna templates migrados
- [ ] Logs sem erros

### **Fase 4 - Frontend** (Opcional)
- [ ] TypeSelector renderiza 5 tipos
- [ ] API calls funcionam
- [ ] Novo form cria emissões
- [ ] Preview de números funciona

---

## 📊 Estatísticas Esperadas

Após migração completa:

```sql
-- Dashboard de validação
SELECT
    'Templates' as tipo,
    COUNT(*) as total
FROM tb_emission_template
UNION ALL
SELECT
    'Emissões',
    COUNT(*)
FROM tb_emission
UNION ALL
SELECT
    'Audit Logs',
    COUNT(*)
FROM tb_emission_audit
UNION ALL
SELECT
    'Tipos Documentos',
    COUNT(*)
FROM tb_document_type;
```

---

## 🐛 Troubleshooting

### **Erro: "Tabela já existe"**

```sql
-- Verificar se já executou antes
SELECT tablename FROM pg_tables WHERE tablename LIKE 'tb_emission%';

-- Se precisar recriar
DROP TABLE IF EXISTS tb_emission_audit CASCADE;
-- ... (executar resto do rollback)
```

### **Erro: "Permission denied"**

```bash
# Verificar utilizador PostgreSQL tem permissões
GRANT ALL PRIVILEGES ON DATABASE <database> TO <user>;
```

### **Erro: "Blueprint name already registered"**

```python
# Em app/__init__.py, verificar se não registou 2x
# Deve ter apenas:
app.register_blueprint(emission_bp)
```

### **API retorna 401 Unauthorized**

```bash
# Verificar token JWT válido
# Verificar utilizador tem permissão 220
SELECT * FROM vbl_userpermissions WHERE username = '<seu_user>' AND pk_permission = 220;
```

---

## 📈 Próximos Passos (Pós-Migração)

1. **Implementar geração PDF multi-tipo**
   - Adaptar `file_service.py` para headers/footers por tipo
   - Templates específicos por tipo de documento

2. **Criar workflows específicos**
   - Notificações: Envio automático email
   - Declarações: Numeração especial
   - Deliberações: Workflow aprovação

3. **Dashboard analytics**
   - Gráficos por tipo de emissão
   - Tendências mensais
   - Utilizadores mais ativos

4. **Assinatura digital**
   - Integrar CMD para todos os tipos
   - Validação assinaturas

5. **Exportação batch**
   - Exportar múltiplas emissões
   - Formatos: PDF, ZIP, CSV

---

## 🎓 Formação Utilizadores

### **Diferenças principais:**

| Antigo | Novo |
|--------|------|
| Apenas Ofícios | 5 tipos documentos |
| 1 numeração | Numeração por tipo |
| Lista simples | Filtros avançados |
| Template fixo | Templates personalizados |

### **Vantagens:**

- ✅ Centralização total
- ✅ Numeração automática multi-tipo
- ✅ Audit logs completos
- ✅ UI/UX moderna
- ✅ Filtros poderosos
- ✅ Extensível

---

## 📞 Suporte

**Em caso de dúvidas:**

1. Verificar logs: `backend/app.log`
2. Consultar este guia
3. Testar em ambiente dev primeiro
4. Usar views de compatibilidade se necessário

---

## ✨ Conclusão

Este sistema foi desenhado para **zero downtime** durante migração:

- ✅ Dados antigos **preservados** intactos
- ✅ APIs antigas **continuam funcionando**
- ✅ Migração **incremental** possível
- ✅ Rollback **simples** se necessário

**Pode começar a implementação com confiança!**

---

**Gerado por Claude Code** 🤖
**Data:** 2025-01-21
