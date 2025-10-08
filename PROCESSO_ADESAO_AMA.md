# 📋 Processo de Adesão AMA - Chave Móvel Digital

## 🎯 Status Atual
✅ Pedido de adesão submetido
📧 Email recebido com instruções
⏳ Aguardando preenchimento de documentação

---

## 📝 Passos a Seguir

### **1. Descarregar Template do Protocolo** (AGORA)
**URL:** https://github.com/amagovpt/doc-SCAP-Fornecedores/raw/main/protocolos_minutas/AMA_Protocolo_SCAP_Fornecedor_Atributos.docx

**Ação:**
- Descarregar ficheiro `.docx`
- Guardar localmente

---

### **2. Preencher Template** (HOJE/AMANHÃ)
**Importante:**
- ❌ **NÃO incluir assinatura** (ainda)
- ✅ Manter formato original
- ✅ Preencher todos os campos obrigatórios

**Dados a incluir:**
- Nome da entidade: **AINTAR**
- NIF da entidade
- Morada completa
- Representante legal (nome, email, telefone)
- Descrição do serviço: "Sistema de gestão de ofícios com assinatura digital CMD"
- URL da aplicação: `https://aintar.pt` (ou domínio atual)

---

### **3. Enviar Protocolo Preenchido para AMA** (APÓS PREENCHER)
**Para:** scap@ama.pt (provavelmente - confirmar no email ou GitHub)

**Assunto:** SCAP Fornecedor - AINTAR - Protocolo Preenchido

**Corpo:**
```
Exmos. Srs.,

Em resposta ao vosso email sobre a adesão ao serviço SCAP Fornecedor,
enviamos em anexo o protocolo preenchido conforme indicações.

Aproveitamos para solicitar credenciais de ambiente de testes (preprod)
para iniciar os testes técnicos enquanto aguardamos a assinatura do protocolo.

Atentamente,
[Nome]
[Cargo]
AINTAR
```

---

### **4. Preencher Documentação Técnica** (PARALELO)
**Documentação disponível em:** https://github.com/amagovpt/doc-SCAP-Fornecedores

**Formulários técnicos necessários:**
- Dados técnicos da aplicação
- URLs de callback
- Ambiente de testes (IP, domínio, etc)
- Contacto técnico (teu email)

**URLs de Callback AINTAR:**
```
Produção: https://aintar.pt/api/v1/letters/sign/callback
Testes:   https://preprod.aintar.pt/api/v1/letters/sign/callback
          (ou usar domínio atual para testes)
```

---

## 🧪 Ambiente de Testes (Preprod)

### **O Que Podes Fazer Antes da Assinatura:**
✅ Receber credenciais de testes (preprod)
✅ Configurar no `.env`:
```bash
CMD_CLIENT_ID=credencial_teste_aqui
CMD_CLIENT_SECRET=secret_teste_aqui
CMD_API_ENV=preprod
```
✅ Testar assinaturas reais com CMD
✅ Validar integração completa
✅ Ajustar código se necessário

### **Quando Receberes Credenciais de Teste:**
1. Email da AMA com `CLIENT_ID_PREPROD` + `CLIENT_SECRET_PREPROD`
2. Configurar no `backend/.env`
3. Reiniciar servidor
4. Testar assinatura com teu telemóvel/NIF
5. Validar que recebe SMS e assina corretamente

---

## 📜 Assinatura do Protocolo

### **Fase 1: AMA Assina**
- AMA valida protocolo
- AMA numera e assina digitalmente
- AMA reenvia protocolo assinado

### **Fase 2: AINTAR Assina**
- Representante legal da AINTAR assina
- Devolve protocolo com ambas as assinaturas
- Protocolo fica juridicamente válido

### **Fase 3: Produção**
- AMA envia credenciais de **produção**
- Configurar no `.env`: `CMD_API_ENV=production`
- Sistema fica oficialmente ativo

---

## 🔧 Configuração Técnica AINTAR

### **Backend (.env)**
```bash
## Assinatura Digital - CMD (Chave Móvel Digital)

# Ambiente de TESTES (usar primeiro)
CMD_CLIENT_ID=cliente_teste_123abc
CMD_CLIENT_SECRET=secret_teste_xyz789
CMD_API_ENV=preprod

# Ambiente de PRODUÇÃO (após assinatura do protocolo)
# CMD_CLIENT_ID=cliente_producao_123abc
# CMD_CLIENT_SECRET=secret_producao_xyz789
# CMD_API_ENV=production
```

### **Verificar Integração:**
```bash
# Reiniciar backend
cd backend
./venv/Scripts/python run_waitress.py

# Deve aparecer:
✅ CMD configurado - Ambiente: preprod
# Em vez de:
⚠️ Credenciais CMD não configuradas!
```

---

## 📊 Timeline Esperado

| Etapa | Prazo | Status |
|-------|-------|--------|
| Submissão de adesão | ✅ Feito | ✅ |
| Preencher protocolo | 1 dia | ⏳ Pendente |
| Enviar protocolo | Após preencher | ⏳ Pendente |
| Preencher docs técnicas | 1 dia (paralelo) | ⏳ Pendente |
| Receber credenciais teste | 2-5 dias | ⏳ Aguardar AMA |
| **INICIAR TESTES** | Após receber credenciais | 🎯 Objetivo |
| AMA assina protocolo | 5-10 dias | ⏳ Aguardar AMA |
| AINTAR assina protocolo | 1 dia | ⏳ Pendente |
| Receber credenciais produção | 1-3 dias | ⏳ Aguardar AMA |
| **PRODUÇÃO ATIVA** | ~15-20 dias total | 🎯 Meta final |

---

## 🔗 Links Importantes

- **Documentação SCAP:** https://github.com/amagovpt/doc-SCAP-Fornecedores
- **Template Protocolo:** https://github.com/amagovpt/doc-SCAP-Fornecedores/raw/main/protocolos_minutas/AMA_Protocolo_SCAP_Fornecedor_Atributos.docx
- **Portal Autenticação:** https://www.autenticacao.gov.pt
- **Email AMA:** scap@ama.pt (confirmar no email recebido)

---

## ✅ Checklist Rápida

### **Hoje:**
- [ ] Descarregar template protocolo
- [ ] Preencher template (sem assinatura)
- [ ] Enviar para AMA

### **Paralelo:**
- [ ] Ler documentação técnica GitHub
- [ ] Preencher formulário técnico
- [ ] Preparar dados de callback/URLs

### **Após receber credenciais teste:**
- [ ] Configurar `.env` com credenciais preprod
- [ ] Reiniciar backend
- [ ] Testar assinatura CMD real
- [ ] Validar fluxo completo

### **Após assinatura protocolo:**
- [ ] Receber credenciais produção
- [ ] Configurar `.env` com credenciais prod
- [ ] Ativar sistema em produção
- [ ] Comunicar aos utilizadores

---

## 💡 Nota Importante

**Enquanto aguardas credenciais:**
- ✅ Sistema continua a funcionar em modo **simulação**
- ✅ Toda a interface e UX já estão prontas
- ✅ Auditoria já funciona
- ✅ Utilizadores podem testar o fluxo

**Quando receberes credenciais:**
- ✅ Apenas configurar 2 linhas no `.env`
- ✅ Reiniciar servidor
- ✅ Sistema passa a fazer assinaturas REAIS
- ✅ Zero alterações de código necessárias

---

**Próxima ação:** Descarregar e preencher template do protocolo 📝
