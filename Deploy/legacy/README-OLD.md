# Sistema de Deployment Modular

Sistema modular e robusto para deployment de aplicações web, desenvolvido em PowerShell para facilitar a manutenção, depuração e extensibilidade.

## 📋 Características Principais

- **Arquitetura Modular**: Cada funcionalidade em módulos separados
- **Sistema de Logging Avançado**: Logs detalhados com níveis configuráveis
- **Gestão Inteligente de Conexões**: Reconexão automática e tratamento de erros
- **Interface Amigável**: Modo interativo com menus coloridos
- **Modo Não-Interativo**: Para automação e CI/CD
- **Validações Robustas**: Verificações em cada etapa do processo
- **Sistema de Backup**: Backup automático antes de cada deployment
- **Diagnósticos Integrados**: Ferramentas para troubleshooting

## 📁 Estrutura do Sistema

```
deployment-system/
├── Deploy-Main.ps1          # Script principal
├── DeployConfig.ps1         # Configurações centralizadas
├── DeployLogger.ps1         # Sistema de logging
├── DeployConnection.ps1     # Gestão de conexões
├── DeployFrontend.ps1       # Módulo de deploy frontend
├── DeployBackend.ps1        # Módulo de deploy backend
├── DeployNginx.ps1         # Módulo de configuração Nginx
├── DeployUI.ps1            # Interface de usuário
└── README.md               # Esta documentação
```

## 🚀 Instalação e Configuração

### 1. Preparação do Ambiente

```powershell
# Verificar política de execução
Get-ExecutionPolicy

# Se necessário, alterar para permitir scripts locais
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Configuração Inicial

Edite o arquivo `DeployConfig.ps1` com suas configurações:

```powershell
# Configurações de servidor
Usuario = "seu_dominio\seu_usuario"
PasswordFile = "C:\caminho\para\arquivo_senha.txt"
ServerIP = "192.168.1.100"
CompartilhamentoNome = "nome_compartilhamento"

# Caminhos locais
CaminhoLocalFrontend = "C:\seu_projeto\frontend\build"
CaminhoLocalBackend = "C:\seu_projeto\backend"
CaminhoProjetoFrontend = "C:\seu_projeto\frontend"
```

### 3. Criar Arquivo de Senha

```powershell
# Criar arquivo de senha seguro
"sua_senha" | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Out-File "C:\caminho\senha.txt"
```

## 💻 Uso do Sistema

### Modo Interativo (Recomendado)

```powershell
.\Deploy-Main.ps1
```

![Menu Principal](menu_example.png)

### Modo Não-Interativo (Automação)

```powershell
# Deployment completo
.\Deploy-Main.ps1 -NonInteractive -Operation "full" -BuildFirst -Verbose

# Apenas frontend
.\Deploy-Main.ps1 -NonInteractive -Operation "frontend" -BuildFirst

# Apenas backend
.\Deploy-Main.ps1 -NonInteractive -Operation "backend"

# Testar conectividade
.\Deploy-Main.ps1 -NonInteractive -Operation "test-connection"
```

## 📝 Operações Disponíveis

### Modo Interativo

| Opção | Descrição |
|-------|-----------|
| 1 | Deployment Completo (Frontend + Backend + Nginx) |
| 2 | Deployment Frontend (com build) |
| 3 | Deployment Frontend SEM BUILD |
| 4 | Deployment apenas do Backend |
| 5 | Deployment Frontend + Backend (sem Nginx) |
| 6 | Criar/Atualizar configuração Nginx |
| 7 | Ver estado dos arquivos |
| 8 | Informações do sistema |
| 9 | Diagnóstico - Testar conectividade |
| 10 | Diagnóstico - Ver estrutura do servidor |
| 11 | Configurações avançadas |

### Modo Não-Interativo

| Operação | Descrição |
|----------|-----------|
| `full` | Deployment completo |
| `frontend` | Deployment do frontend (com build) |
| `frontend-nobuild` | Deployment do frontend (sem build) |
| `backend` | Deployment do backend |
| `frontend-backend` | Frontend + Backend |
| `nginx` | Apenas configuração Nginx |
| `test-connection` | Teste de conectividade |
| `build-only` | Apenas build do frontend |
| `validate-build` | Validar build existente |

## 🔧 Configurações Avançadas

### Sistema de Logging

```powershell
# Configurar nível de log
$Global:DeployConfig.VerboseLogging = $true

# Localização do arquivo de log
$Global:DeployConfig.LogFile = "C:\logs\deployment.log"
```

### Configurações de Backup

```powershell
# Habilitar/desabilitar backups
$Global:DeployConfig.CriarBackup = $true

# Número de backups a manter
$Global:DeployConfig.ManterBackups = 5
```

### Exclusões do Backend

O sistema automaticamente exclui:

**Pastas:**
- `venv`, `__pycache__`, `.git`, `node_modules`
- `.pytest_cache`, `.coverage`, `htmlcov`
- `instance`, `logs`

**Arquivos:**
- `*.pyc`, `*.pyo`, `*.pyd`
- `.DS_Store`, `Thumbs.db`
- `*.log`, `.env.local`, `.env.development`
- `*.swp`, `*.tmp`

## 🛠 Solução de Problemas

### Problemas de Conexão

```powershell
# Testar conectividade
.\Deploy-Main.ps1 -NonInteractive -Operation "test-connection"

# Ver diagnóstico detalhado (modo interativo)
# Opção 9 - Diagnóstico - Testar conectividade
```

### Problemas de Build

```powershell
# Validar build existente
.\Deploy-Main.ps1 -NonInteractive -Operation "validate-build"

# Fazer apenas o build
.\Deploy-Main.ps1 -NonInteractive -Operation "build-only"
```

### Logs e Depuração

```powershell
# Executar com logging verbose
.\Deploy-Main.ps1 -Verbose

# Ver logs pelo menu interativo
# Opção 11 - Configurações avançadas -> Opção 5 - Ver logs
```

### Problemas Comuns

#### 1. Erro de Credenciais
- Verificar arquivo de senha
- Confirmar usuário e domínio
- Testar acesso manual ao compartilhamento

#### 2. Build Não Encontrado
- Verificar caminho do projeto frontend
- Executar `npm install` no projeto
- Verificar se `npm run build` funciona manualmente

#### 3. Problemas de Nginx
- Verificar sintaxe da configuração (Opção 11 -> 4)
- Confirmar caminhos SSL
- Verificar permissões no servidor

## 🔍 Estrutura dos Módulos

### DeployConfig.ps1
- Configurações centralizadas
- Validação de configurações
- Funções de utilidade

### DeployLogger.ps1
- Sistema de logging com níveis
- Output colorido no console
- Logging em arquivo

### DeployConnection.ps1
- Gestão de conexões PSLevel
- Reconexão automática
- Diagnósticos de conectividade

### DeployFrontend.ps1
- Build do projeto React/Frontend
- Validação de build
- Deployment com backup

### DeployBackend.ps1
- Deployment inteligente de arquivos
- Exclusões configuráveis
- Validação de estrutura

### DeployNginx.ps1
- Geração de configuração
- Validação de sintaxe
- Deployment seguro

### DeployUI.ps1
- Interface interativa
- Menus coloridos
- Diagnósticos visuais

## 📈 Integração CI/CD

### GitHub Actions Example

```yaml
name: Deploy Application

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy Application
      run: |
        .\Deploy-Main.ps1 -NonInteractive -Operation "full" -BuildFirst -Verbose
      shell: powershell
```

### Azure DevOps Example

```yaml
trigger:
- main

pool:
  vmImage: 'windows-latest'

steps:
- task: PowerShell@2
  displayName: 'Deploy Application'
  inputs:
    targetType: 'filePath'
    filePath: 'Deploy-Main.ps1'
    arguments: '-NonInteractive -Operation "full" -BuildFirst -Verbose'
```

## 🤝 Contribuições

Para contribuir com melhorias:

1. Fork do repositório
2. Criar branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit das mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Criar Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Criar issue no repositório
- Consultar logs de deployment
- Usar ferramentas de diagnóstico integradas

---

**Desenvolvido com ❤️ para facilitar deployments confiáveis e eficientes**