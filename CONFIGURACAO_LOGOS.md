# Configuração de Logos e Caminhos - Sistema de Emissões

## 📁 Estrutura de Diretórios

### Desenvolvimento
```
C:/Users/rui.ramos/Desktop/APP/
├── frontend/public/           ← LOGOS_DIR (desenvolvimento)
│   ├── LOGO_VERTICAL_CORES.png
│   ├── logo_aintar.png
│   └── ...
├── backend/temp/              ← PDF_OUTPUT_DIR (desenvolvimento)
└── backend/app/utils/fonts/   ← FONTS_DIR
```

### Produção
```
D:/APP/
├── logos/                     ← LOGOS_DIR (produção)
│   ├── LOGO_VERTICAL_CORES.png
│   ├── logo_aintar.png
│   └── ...
├── pdfs/                      ← PDF_OUTPUT_DIR (produção)
└── FilesApp/                  ← FILES_DIR
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente (Produção)

Adicionar ao arquivo `.env.production`:

```bash
# Diretórios de Logos e PDFs
LOGOS_DIR=D:/APP/logos
PDF_OUTPUT_DIR=D:/APP/pdfs
```

### 2. Caminhos no config.py

As configurações estão definidas em `backend/config.py`:

```python
class DevelopmentConfig(Config):
    LOGOS_DIR = 'C:/Users/rui.ramos/Desktop/APP/frontend/public'
    PDF_OUTPUT_DIR = 'C:/Users/rui.ramos/Desktop/APP/backend/temp'
    FONTS_DIR = os.path.join(os.path.dirname(__file__), 'app', 'utils', 'fonts')

class ProductionConfig(Config):
    LOGOS_DIR = os.getenv('LOGOS_DIR', 'D:/APP/logos')
    PDF_OUTPUT_DIR = os.getenv('PDF_OUTPUT_DIR', 'D:/APP/pdfs')
    FONTS_DIR = os.path.join(os.path.dirname(__file__), 'app', 'utils', 'fonts')
```

### 3. Como o Sistema Usa os Logos

1. **No Template**: O utilizador seleciona o logo (ex: `LOGO_VERTICAL_CORES.png`)
2. **Ao Gerar PDF**: O sistema procura o ficheiro em `{LOGOS_DIR}/{logo_path}`
3. **Caminho Completo**:
   - **Dev**: `C:/Users/rui.ramos/Desktop/APP/frontend/public/LOGO_VERTICAL_CORES.png`
   - **Prod**: `D:/APP/logos/LOGO_VERTICAL_CORES.png`

## 🚀 Deploy em Produção

### Passo 1: Criar Diretórios
```powershell
# Criar diretórios necessários
mkdir D:\APP\logos
mkdir D:\APP\pdfs
```

### Passo 2: Copiar Logos
```powershell
# Copiar logos do desenvolvimento para produção
copy "C:\Users\rui.ramos\Desktop\APP\frontend\public\LOGO_VERTICAL_CORES.png" "D:\APP\logos\"
copy "C:\Users\rui.ramos\Desktop\APP\frontend\public\logo_aintar.png" "D:\APP\logos\"
```

### Passo 3: Configurar Variáveis de Ambiente
Criar/editar `.env.production` no backend:
```bash
FLASK_ENV=production
LOGOS_DIR=D:/APP/logos
PDF_OUTPUT_DIR=D:/APP/pdfs
```

### Passo 4: Permissões
Garantir que a aplicação tem permissões de leitura em `LOGOS_DIR` e escrita em `PDF_OUTPUT_DIR`.

## 🎨 Adicionar Novos Logos

### Em Desenvolvimento
1. Colocar o ficheiro em `frontend/public/`
2. Adicionar opção no `TemplateManager.jsx`:
   ```jsx
   <option value="novo_logo.png">Novo Logo</option>
   ```

### Em Produção
1. Copiar o ficheiro para `D:\APP\logos\`
2. Mesma alteração no código frontend

## 📝 Estrutura de Dados do Template

O campo `logo_path` é guardado no template:

```json
{
  "name": "Ofício de Autorização",
  "logo_path": "LOGO_VERTICAL_CORES.png",
  "body": "...",
  "header_template": "...",
  "footer_template": "...",
  "metadata": {...}
}
```

## 🔍 Troubleshooting

### Logo não aparece no PDF

1. **Verificar se o ficheiro existe**:
   ```python
   import os
   logo_path = "D:/APP/logos/LOGO_VERTICAL_CORES.png"
   print(f"Existe: {os.path.exists(logo_path)}")
   ```

2. **Verificar logs do backend**:
   ```
   [WARNING] Logo não encontrado: D:/APP/logos/LOGO_VERTICAL_CORES.png
   ```

3. **Verificar permissões** do diretório

4. **Verificar variável de ambiente**:
   ```python
   from flask import current_app
   print(current_app.config.get('LOGOS_DIR'))
   ```

### Caminho não encontrado

- Verificar se usou barras corretas (`/` ou `\`)
- Em Windows, preferir `D:/APP/logos` em vez de `D:\APP\logos`
- Verificar se o FLASK_ENV está correto (`development` ou `production`)

## 📊 Exemplos de Uso

### Preview com Logo Customizado
```javascript
const previewData = {
  template_body: formData.body,
  header_template: formData.header_template,
  footer_template: formData.footer_template,
  logo_path: 'LOGO_VERTICAL_CORES.png',  // ← Logo selecionado
  context: { ... }
};
```

### Geração de PDF Final
O sistema usa automaticamente o `logo_path` do template guardado na base de dados.
