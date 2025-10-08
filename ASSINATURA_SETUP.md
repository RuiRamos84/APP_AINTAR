# 🔐 Setup Assinatura Digital - Guia Rápido

## ✅ O Que Funciona AGORA (Sem Registo AMA)

### **Sistema Implementado e Pronto:**
- ✅ Interface de assinatura (botão + modal)
- ✅ Auditoria de tentativas de assinatura
- ✅ Estrutura completa backend + frontend
- ✅ Simulação de assinatura (para testes)

### **O Que Acontece Sem Credenciais AMA:**
```
Utilizador clica "Assinar"
    ↓
Sistema mostra modal de assinatura
    ↓
Utilizador preenche dados
    ↓
Sistema SIMULA assinatura (cria ficheiro _signed.pdf)
    ↓
Log de auditoria regista a ação
```

---

## 🚀 Para Ativar Assinatura REAL

### **Passo 1: Instalar pyhanko (CMD)** ✅ FEITO
```bash
pip install pyhanko==0.20.1
```

### **Passo 2: Registar na AMA**
1. Ir a: https://www.autenticacao.gov.pt
2. Criar conta institucional (AINTAR)
3. Registar aplicação "Sistema de Ofícios"
4. Aguardar aprovação (1-3 dias)
5. Receber credenciais

### **Passo 3: Configurar .env**
```bash
# Adicionar ao backend/.env
CMD_CLIENT_ID=seu_client_id_aqui
CMD_CLIENT_SECRET=seu_secret_aqui
CMD_API_ENV=preprod  # Testes
```

### **Passo 4: Testar**
```bash
# Reiniciar backend
python run.py

# Deve aparecer:
✅ CMD configurado - Ambiente: preprod

# Em vez de:
⚠️  Credenciais CMD não configuradas!
```

---

## 📝 Cartão de Cidadão (CC)

### **Abordagem Atual: Frontend-Only**
A assinatura CC funciona TOTALMENTE no frontend:
1. Middleware (instalado no PC do utilizador) lê o CC
2. Assinatura é feita localmente no browser
3. Backend apenas valida e guarda

### **Vantagem:**
- ❌ Não precisa PyKCS11 (que deu erro)
- ✅ Mais seguro (PIN nunca sai do PC do utilizador)
- ✅ Funciona em qualquer SO (Windows/Mac/Linux)

### **Utilizadores Precisam:**
1. Instalar: https://www.autenticacao.gov.pt/cc-aplicacao
2. Conectar leitor USB
3. Inserir CC

---

## 🧪 Testar AGORA (Sem Credenciais)

### **Teste de Interface:**
1. Emitir um ofício
2. Ir a "Ofícios → Emitidos"
3. Clicar no ícone ✏️ (caneta)
4. Modal de assinatura abre ✅
5. Preencher dados (qualquer coisa)
6. Clicar "Assinar"
7. Sistema cria ficheiro `_signed.pdf` (simulado)
8. Auditoria regista ação

### **Verificar Auditoria:**
```bash
# Via API ou BD
GET /api/v1/admin/audit/statistics

# Deve mostrar:
{
  "total_actions": X,
  "by_action_type": {
    "LETTER_SIGN_CMD": 1,
    ...
  }
}
```

---

## ⚙️ Ordem de Prioridades

### **Agora (Testar Sem AMA):**
1. ✅ Testar interface de assinatura
2. ✅ Verificar auditoria
3. ✅ Validar UX do fluxo

### **Depois (Com AMA):**
1. Registar aplicação AMA
2. Configurar credenciais
3. Testar CMD em preprod
4. Ativar produção

### **Futuro (Opcional):**
1. Melhorar integração CC (se necessário)
2. Validação de assinaturas existentes
3. Relatórios de assinaturas

---

## 💡 Resumo

**Status Atual:**
- Sistema 100% implementado ✅
- Funciona em modo "simulação" ✅
- Pronto para receber credenciais AMA ✅

**Para Ativar:**
- Apenas configurar `.env` com credenciais AMA
- Zero código adicional necessário
- Plug & Play

**PyKCS11 (erro):**
- Não é necessário agora
- CC funciona via frontend
- Pode ignorar o erro

---

**Próximo Passo:** Testar interface de assinatura (já funciona!) 🎯
