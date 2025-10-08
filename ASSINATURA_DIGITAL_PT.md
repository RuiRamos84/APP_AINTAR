# 🔐 Assinatura Digital Portuguesa - Especificação Técnica

## 📋 Visão Geral

Sistema de assinatura digital para ofícios integrando:
- ✅ **Chave Móvel Digital (CMD)** - Via smartphone
- ✅ **Cartão de Cidadão (CC)** - Via leitor de cartões
- ✅ **Conformidade eIDAS** - Regulamento UE nº 910/2014

---

## 🏗️ Arquitetura Recomendada

### **Integração com AMA (Agência para a Modernização Administrativa)**

A AMA fornece:
- API de Assinatura com Chave Móvel Digital
- SDK para integração com Cartão de Cidadão
- Conformidade legal total

---

## 💻 Bibliotecas Necessárias

### **Backend (Python):**
```txt
pyhanko==0.20.1          # Assinatura PDF
PyKCS11==1.5.12          # Cartão Cidadão
pycryptodome==3.19.0     # Criptografia
```

### **Frontend (JavaScript):**
```json
{
  "autenticacao-gov": "^1.0.0"  // Middleware CC (se disponível via npm)
}
```

---

## 🔧 Configuração Necessária

### **1. Registro na AMA:**
- URL: https://www.autenticacao.gov.pt
- Obter credenciais (Client ID e Secret) para CMD
- Especificar âmbito: "Assinatura de Documentos Oficiais"

### **2. Variáveis de Ambiente (.env):**
```bash
CMD_CLIENT_ID=your_client_id_here
CMD_CLIENT_SECRET=your_client_secret_here
CMD_API_ENV=production  # ou 'preprod' para testes
```

---

## 📝 Próximos Passos

1. ✅ Implementar base do sistema (Fases 1 e 2)
2. ⏳ Registar na AMA e obter credenciais
3. ⏳ Implementar integração CMD
4. ⏳ Implementar integração CC (requer middleware instalado nos clientes)
5. ⏳ Testes em ambiente de pré-produção

---

**NOTA IMPORTANTE:**
A implementação completa de CMD/CC requer credenciais oficiais da AMA.
Vou criar a estrutura completa, mas a ativação real dependerá do registro oficial.

