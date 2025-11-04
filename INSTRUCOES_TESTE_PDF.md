# 🔧 INSTRUÇÕES DE TESTE - GERAÇÃO DE PDF (VERSÃO MULTI-PÁGINA)

**Data:** 2025-10-27
**Versão:** MULTI-PAGE-FIX
**Autor:** Claude Code (Senior Developer Mode)

---

## ⚠️ IMPORTANTE: LIMPEZA DE CACHE

Antes de qualquer teste, **DEVE** fazer limpeza de cache do browser:

### Método 1: Hard Refresh (RECOMENDADO)
1. Abrir a página das emissões
2. Pressionar: **Ctrl + F5** (Windows/Linux) ou **Cmd + Shift + R** (Mac)
3. Aguardar recarregamento completo

### Método 2: Limpeza Manual
1. Pressionar **F12** para abrir DevTools
2. Clicar com botão direito no ícone de refresh
3. Selecionar "**Empty Cache and Hard Reload**"

### Método 3: Limpeza Total (se os anteriores não funcionarem)
1. **F12** → **Application** → **Storage** → **Clear site data**
2. Fechar e reabrir o browser
3. Fazer login novamente

---

## 🚀 O QUE FOI IMPLEMENTADO

### 1. **Geração de PDF Robusta com Suporte Multi-Página**
- ✅ Validações em **6 fases** distintas
- ✅ Logs detalhados com emojis para fácil identificação
- ✅ ID único de execução para rastreamento (cache-busting)
- ✅ Validação de dados ANTES de gerar PDF
- ✅ Detecção automática de PDFs vazios (<5KB)
- ✅ Download automático de PDF de debug em caso de erro
- ✅ **NOVO:** Captura de TODO o conteúdo, não apenas viewport
- ✅ **NOVO:** Divisão automática em múltiplas páginas A4 quando necessário

### 2. **Sistema de Logs Compreensivo**
Cada execução agora gera logs detalhados no console:

```
🚀 [PDF_GEN_1730000000_abc123] INÍCIO DA GERAÇÃO DE PDF
📋 [PDF_GEN_1730000000_abc123] Emissão ID: 123
📋 [PDF_GEN_1730000000_abc123] Versão do código: 2025-10-27-SENIOR-FIX
📥 [PDF_GEN_1730000000_abc123] FASE 1: Carregando dados...
✅ [PDF_GEN_1730000000_abc123] Dados carregados
📄 [PDF_GEN_1730000000_abc123] Template encontrado: "AINTAR Autorização"
🔧 [PDF_GEN_1730000000_abc123] FASE 2: Preparando contexto...
✅ [PDF_GEN_1730000000_abc123] Contexto preparado com 25 variáveis
🎨 [PDF_GEN_1730000000_abc123] FASE 3: Renderizando template...
   📝 Variáveis substituídas: 15
✅ [PDF_GEN_1730000000_abc123] Template renderizado
🖼️ [PDF_GEN_1730000000_abc123] FASE 4: Injetando logo...
✅ [PDF_GEN_1730000000_abc123] Logo injetado com sucesso
📄 [PDF_GEN_1730000000_abc123] FASE 5: Gerando PDF via html2pdf.js...
✅ [PDF_GEN_1730000000_abc123] PDF gerado com sucesso!
📊 [PDF_GEN_1730000000_abc123] Tamanho do PDF: 125430 bytes (122.49 KB)
📤 [PDF_GEN_1730000000_abc123] FASE 6: Enviando PDF para backend...
✅ [PDF_GEN_1730000000_abc123] PDF enviado com sucesso!
🎉 [PDF_GEN_1730000000_abc123] PROCESSO CONCLUÍDO COM SUCESSO!
```

### 3. **Validações Implementadas**

#### Fase 1: Validação de Dados
- ❌ Erro se emissão não for encontrada
- ❌ Erro se template não existir
- ❌ Erro se template não tiver body

#### Fase 2: Contexto de Variáveis
- ✅ Valores padrão para campos obrigatórios
- ✅ Conversão automática para string
- ✅ Tratamento de null/undefined
- ✅ Case-insensitive matching ({{NOME}} = {{nome}})

#### Fase 3: Renderização
- ✅ Contador de variáveis substituídas
- ❌ Erro se body ficar vazio após renderização
- ✅ Preview de conteúdo renderizado nos logs

#### Fase 4: HTML e Logo
- ✅ Preservação de atributos originais da <td>
- ✅ Logo adaptável (max-width: 100%)
- ❌ Erro se HTML final for muito pequeno (<100 chars)

#### Fase 5: Geração de PDF
- ✅ Aguarda 500ms para imagens carregarem
- ❌ Erro se PDF for muito pequeno (<5KB)
- ✅ Download automático de PDF de debug

#### Fase 6: Upload
- ✅ Validação de sucesso do upload
- ✅ Feedback detalhado ao usuário

---

## 🧪 COMO TESTAR

### Teste 1: Verificar Versão do Código (CRÍTICO)

1. Abrir a página de emissões
2. Pressionar **F12** → **Console**
3. Clicar em "Gerar PDF" numa emissão qualquer
4. **VERIFICAR** se aparece esta mensagem:
   ```
   🚀 [PDF_GEN_...] INÍCIO DA GERAÇÃO DE PDF
   📋 [PDF_GEN_...] Versão do código: 2025-10-27-MULTI-PAGE-FIX
   [PDFService] Usando método DIRETO html2canvas + jsPDF (multi-página)
   ```

**❌ SE NÃO APARECER**: O browser está com código antigo em cache!
→ Voltar ao início e fazer **Hard Refresh** (Ctrl+F5)

---

### Teste 2: Emissão Completa (HAPPY PATH)

1. **Criar nova emissão** com TODOS os campos preenchidos:
   - Template: AINTAR Autorização de Ligação
   - Assunto: "Teste completo de geração de PDF"
   - Nome Requerente: "João Silva"
   - NIF: "123456789"
   - Morada: "Rua Teste, 123"
   - Código Postal: "1000-000"
   - Localidade: "Lisboa"
   - Email: "teste@example.com"
   - Todos os custom_data necessários

2. **Clicar em "Gerar PDF"**

3. **Verificar no Console (F12)**:
   - Deve mostrar todas as 6 fases
   - Tamanho do PDF deve ser >50KB
   - Deve terminar com: `🎉 PROCESSO CONCLUÍDO COM SUCESSO!`

4. **Verificar Alert**:
   ```
   ✅ PDF gerado e enviado com sucesso!

   📄 Emissão: OF-2025.S.OFI.000123
   📦 Arquivo: OF_2025_S_OFI_000123_2025-10-27.pdf
   💾 Tamanho: 122.49 KB
   ```

5. **Verificar na lista**:
   - Emissão deve mudar de status "Rascunho" → "Emitido"
   - Botão deve mudar de "Gerar PDF" → "Download PDF"

---

### Teste 3: Emissão com Campos Vazios (VALIDAÇÃO)

1. **Criar emissão** com dados mínimos:
   - Apenas Template e Assunto

2. **Clicar em "Gerar PDF"**

3. **Verificar**:
   - Deve gerar PDF mesmo assim (com valores padrão)
   - Console mostra variáveis vazias como ""
   - PDF deve ter pelo menos o template base

---

### Teste 4: Template sem Body (ERRO ESPERADO)

1. **Criar template** sem conteúdo no campo "Body"

2. **Criar emissão** com esse template

3. **Clicar em "Gerar PDF"**

4. **Verificar erro**:
   ```
   ❌ ERRO: Template não possui conteúdo no corpo (body).
   Impossível gerar PDF vazio.
   ```

---

### Teste 5: Documento Longo (Multi-Página)

1. **Criar emissão** com template que tenha muito conteúdo no body
   - Adicionar texto longo no campo de assunto ou corpo do template
   - Ou usar template com múltiplas seções

2. **Clicar em "Gerar PDF"**

3. **Verificar no Console**:
   - Deve mostrar: `[PDFService] Conteúdo requer X páginas`
   - Deve mostrar: `[PDFService] Página 1/X adicionada`, `Página 2/X adicionada`, etc.

4. **Abrir PDF gerado**:
   - Deve ter múltiplas páginas
   - Conteúdo deve fluir naturalmente entre páginas
   - TODO o conteúdo deve estar presente

---

### Teste 6: Preview no Modal "Visualizar"

1. **Clicar em "Visualizar"** numa emissão

2. **Abrir tab "Pré-visualização"**

3. **Verificar no Console**:
   ```
   [EmissionPreview] Gerando preview HTML...
   [EmissionPreview] Template carregado: AINTAR Autorização
   [EmissionPreview] Contexto preparado com 25 variáveis
   [EmissionPreview] Variáveis substituídas: 15
   [EmissionPreview] Conteúdo renderizado:
     - Header: 1234 caracteres
     - Body: 5678 caracteres
     - Footer: 234 caracteres
   ```

4. **Verificar preview**:
   - Logo deve aparecer
   - Todas as variáveis substituídas
   - Layout correto (10% logo, 50% dados)

---

## 🔧 CORREÇÃO DA VERSÃO MULTI-PÁGINA

### Problema Resolvido: "PDF mostra apenas metade do conteúdo"

**Causa Raiz**: O elemento HTML temporário tinha `max-height:90vh;overflow:auto;`, o que limitava o elemento a 90% da altura do viewport e criava scrollbars. O html2canvas só capturava o conteúdo visível no viewport, não o conteúdo total scrollável.

**Solução Implementada**:

1. **Remoção da limitação de altura**:
   - Removido `max-height:90vh;overflow:auto;`
   - Elemento agora expande para altura natural completa
   - html2canvas captura TODO o conteúdo, não apenas viewport

2. **Implementação de Multi-Página**:
   - PDF agora divide automaticamente conteúdo em múltiplas páginas A4
   - Se conteúdo > 277mm (altura A4 útil), cria páginas adicionais
   - Cada página mostra continuação do conteúdo anterior
   - Margens reduzidas de 15mm → 10mm para mais espaço útil

3. **Logs Melhorados**:
   ```
   [PDFService] Canvas gerado: 1587 x 2245 pixels
   [PDFService] Tamanho da imagem no PDF: 190 x 268.5 mm
   [PDFService] Conteúdo cabe em 1 página
   ```
   OU
   ```
   [PDFService] Canvas gerado: 1587 x 4800 pixels
   [PDFService] Tamanho da imagem no PDF: 190 x 574.2 mm
   [PDFService] Conteúdo requer 3 páginas
   [PDFService] Página 1/3 adicionada
   [PDFService] Página 2/3 adicionada
   [PDFService] Página 3/3 adicionada
   ```

**Resultado**: PDFs agora contêm TODO o conteúdo do documento, independentemente do tamanho!

---

## 🐛 DIAGNÓSTICO DE PROBLEMAS

### Problema: "PDF está em branco"

**Diagnóstico**:
1. Abrir console (F12)
2. Procurar por:
   ```
   📄 [PDF_GEN_...] Body: X caracteres
   ```
3. Se X = 0 ou muito pequeno → Template está vazio ou variáveis não substituídas
4. Procurar por:
   ```
   📊 [PDF_GEN_...] Tamanho do PDF: X bytes
   ```
5. Se X < 5000 → PDF de debug será baixado automaticamente

**Soluções**:
- Verificar se template tem conteúdo no campo "Body"
- Verificar se variáveis estão corretas: `{{NOME_REQUERENTE}}` não `{{nome}}`
- Verificar se emissão tem dados preenchidos

---

### Problema: "Logs não aparecem no console"

**Diagnóstico**:
1. Console mostra logs antigos `[EmissionList]` sem emoji?
   → **Cache do browser!**

**Solução**:
1. **Ctrl + F5** (Hard Refresh)
2. Se não resolver: Limpar cache completo (F12 → Application → Clear site data)
3. Fechar e reabrir browser

---

### Problema: "Logo não aparece no PDF"

**Diagnóstico**:
1. Procurar no console:
   ```
   🖼️ [PDF_GEN_...] Logo URL: /logo_aintar.png
   ✅ [PDF_GEN_...] Logo injetado com sucesso
   ```
2. Se aparecer "Nenhuma <td> vazia encontrada" → Template não tem <td> vazia para logo

**Solução**:
- Verificar se template tem `<td></td>` vazia no header
- Verificar se arquivo `/logo_aintar.png` existe em `frontend/public/`

---

### Problema: "Erro ao enviar PDF para servidor"

**Diagnóstico**:
1. Procurar no console backend (terminal Python):
   ```
   [UPLOAD_PDF] Recebendo PDF para emissão X
   ```
2. Se não aparecer → Problema de conectividade/autenticação

**Solução**:
- Verificar se backend está rodando
- Verificar token JWT válido (re-login)
- Verificar permissões do usuário

---

## 📊 CHECKLIST DE TESTE COMPLETO

- [ ] Hard Refresh feito (Ctrl+F5)
- [ ] Console mostra logs com versão "2025-10-27-MULTI-PAGE-FIX"
- [ ] Console mostra emojis (🚀 📋 ✅ etc)
- [ ] Teste 1: Emissão completa → PDF gerado com sucesso
- [ ] Teste 2: Preview funciona corretamente
- [ ] Teste 3: Logo aparece no PDF
- [ ] Teste 4: Variáveis são substituídas
- [ ] Teste 5: **NOVO:** Documento longo → PDF multi-página com todo conteúdo
- [ ] Teste 6: Status muda de Rascunho → Emitido
- [ ] Teste 7: Botão muda de "Gerar PDF" → "Download PDF"
- [ ] Teste 8: Download funciona após geração
- [ ] Teste 9: **CRÍTICO:** Abrir PDF e verificar que TODO o conteúdo está presente (não apenas metade!)

---

## 📝 NOTAS ADICIONAIS

### Variáveis Disponíveis no Template

**Sistema (automático)**:
- `{{NUMERO_OFICIO}}` ou `{{EMISSION_NUMBER}}`
- `{{DATA}}` ou `{{DATE}}` ou `{{DATA_EMISSAO}}`
- `{{ASSUNTO}}` ou `{{SUBJECT}}`

**Recipient Data**:
- `{{NOME}}` ou `{{NOME_REQUERENTE}}`
- `{{MORADA}}` ou `{{ENDERECO}}`
- `{{NIF}}` ou `{{NIPC}}`
- `{{EMAIL}}`
- `{{CODIGO_POSTAL}}`
- `{{LOCALIDADE}}`

**Custom Data** (específico do template):
- Qualquer campo definido no metadata do template
- Exemplo: `{{NUMERO_CONTADOR}}`, `{{POTENCIA}}`, etc.

**Case-Insensitive**: `{{NOME}}` = `{{nome}}` = `{{NoMe}}`

---

## 🆘 SUPORTE

Se após todos estes testes o problema persistir:

1. **Copiar TODO o output do console** (Ctrl+A no console, Ctrl+C)
2. **Procurar pelo ID de execução**: `PDF_GEN_...`
3. **Verificar se PDF de debug foi baixado** (na pasta Downloads)
4. **Reportar com**:
   - ID de execução
   - Logs completos do console
   - Screenshot do erro
   - PDF de debug (se gerado)

---

**FIM DO DOCUMENTO**
