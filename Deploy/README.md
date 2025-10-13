# Sistema de Deployment Modular v2.0

Sistema automatizado de deployment para aplicações web com frontend React e backend Python, utilizando Task Scheduler para gestão remota de serviços.

## Características

- **Deployment automatizado** de frontend (React) e backend (Python)
- **Modo de manutenção** automático durante deployment
- **Gestão remota de serviços** (nginx, backend) via Task Scheduler
- **Sistema de backups** automático com rotação
- **Logging detalhado** de todas as operações
- **Validação de integridade** de arquivos e serviços
- **Configuração centralizada** em DeployConfig.ps1
- **Execução interativa ou não-interativa** (menu ou linha de comando)

## Novidades v2.0

- **Task Scheduler em vez de WinRM** - Não requer configuração complexa de WinRM/CredSSP
- **Gestão de processos melhorada** - Controle direto de nginx e Python via PowerShell
- **Modo debug/produção** - Configuração ShowBackendWindow para visibilidade do backend
- **Execução mais confiável** - Scripts em PowerShell puro, sem dependência de .bat externos
- **Logs mais detalhados** - Informação de PID, Session ID, e status de processos

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTE (Workstation)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Deploy-Main  │→ │ DeployConfig │ ← │ DeployUI     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ↓                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │         DeployServerManager.ps1                  │          │
│  │  • Invoke-RemoteServerCommand-TaskScheduler      │          │
│  │  • Enable/Disable-MaintenanceMode                │          │
│  │  • Start/Stop-BackendProcess                     │          │
│  └──────────────────────────────────────────────────┘          │
│         ↓                                                       │
└─────────│───────────────────────────────────────────────────────┘
          │ SMB (porta 445)
          │ schtasks.exe (Task Scheduler)
          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SERVIDOR (172.16.2.35)                        │
│                                                                 │
│  \\172.16.2.35\app\NewAPP\                                      │
│  ├── nginx\                                                     │
│  │   ├── nginx.exe                                             │
│  │   ├── conf\nginx.conf                                       │
│  │   ├── html\react-app\build\ (frontend)                      │
│  │   └── maintenance.flag (controle de manutenção)             │
│  │                                                              │
│  └── backend\                                                   │
│      ├── start.bat                                              │
│      ├── app\                                                   │
│      └── venv\                                                  │
│                                                                 │
│  D:\APP\NewAPP\deploy_log_*.txt (logs de execução)             │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Deployment

```
1. ATIVAR MANUTENÇÃO
   ├─ Criar maintenance.flag
   ├─ Parar nginx
   └─ Reiniciar nginx (mostra página de manutenção)

2. PARAR BACKEND
   ├─ Enumerar processos Python
   ├─ Terminar processos
   └─ Verificar que pararam

3. DEPLOYMENT
   ├─ Fazer backup (opcional)
   ├─ Copiar arquivos frontend
   ├─ Copiar arquivos backend
   └─ Verificar integridade

4. REINICIAR BACKEND
   ├─ Executar start.bat
   ├─ Aguardar inicialização
   └─ Verificar processo ativo

5. DESATIVAR MANUTENÇÃO
   ├─ Remover maintenance.flag
   ├─ Parar nginx
   └─ Reiniciar nginx (volta ao normal)
```

## Pré-requisitos

### No Cliente (Workstation)
- Windows com PowerShell 5.1 ou superior
- Acesso de rede ao servidor via SMB (porta 445)
- Credenciais com permissões para:
  - Aceder ao compartilhamento \\172.16.2.35\app
  - Criar/executar/remover Scheduled Tasks no servidor

### No Servidor (172.16.2.35)
- Windows Server com Task Scheduler ativo
- Compartilhamento SMB configurado: \\172.16.2.35\app
- Nginx instalado em D:\APP\NewAPP\nginx\
- Backend Python em D:\APP\NewAPP\backend\
- Arquivo start.bat configurado para iniciar o backend

## Instalação

### 1. Configurar arquivo de senha

```powershell
# Criar arquivo de senha encriptado
$password = Read-Host -AsSecureString "Digite a senha"
$password | ConvertFrom-SecureString | Out-File "C:\Users\rui.ramos\Desktop\APP\PServ.txt"
```

### 2. Editar DeployConfig.ps1

Ajuste as configurações conforme necessário:

```powershell
$Global:DeployConfig = @{
    Usuario = "aintar\rui.ramos"
    PasswordFile = "C:\Users\rui.ramos\Desktop\APP\PServ.txt"
    ServerIP = "172.16.2.35"

    # Caminhos locais (onde estão os arquivos a enviar)
    CaminhoLocalFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend\build"
    CaminhoLocalBackend = "C:\Users\rui.ramos\Desktop\APP\backend"
    CaminhoProjetoFrontend = "C:\Users\rui.ramos\Desktop\APP\frontend"

    # Opções de backup
    CriarBackup = $true
    ManterBackups = 5

    # Debug
    VerboseLogging = $true
}

# Gestão remota
$Global:DeployConfig.RemoteManagement = @{
    BackendProcessName = "python"
    BackendStartScriptPath = "D:\APP\NewAPP\backend\start.bat"

    # $true = janela visível (DEBUG)
    # $false = background (PRODUÇÃO)
    ShowBackendWindow = $true
}
```

### 3. Validar configuração

```powershell
cd C:\Users\rui.ramos\Desktop\APP\Deploy
.\Deploy-Main.ps1 -ValidateOnly
```

## Uso

### Modo Interativo (Menu)

```powershell
.\Deploy-Main.ps1
```

Opções do menu:
- **1** - Deploy Frontend e Backend (completo)
- **2** - Deploy apenas Frontend
- **3** - Deploy apenas Backend
- **4** - Ativar modo de manutenção
- **5** - Desativar modo de manutenção
- **6** - Parar Backend
- **7** - Iniciar Backend
- **8** - Reiniciar Nginx
- **9** - Criar backup manual
- **10** - Validar configuração
- **11** - Testar conectividade
- **0** - Sair

### Modo Não-Interativo (Linha de Comando)

```powershell
# Deploy completo
.\Deploy-Main.ps1 -DeployAll

# Deploy apenas frontend
.\Deploy-Main.ps1 -DeployFrontend

# Deploy apenas backend
.\Deploy-Main.ps1 -DeployBackend

# Ativar manutenção
.\Deploy-Main.ps1 -EnableMaintenance

# Desativar manutenção
.\Deploy-Main.ps1 -DisableMaintenance

# Validar sem executar
.\Deploy-Main.ps1 -ValidateOnly
```

### Exemplo de Output

```
================================================================
                   SISTEMA DE DEPLOYMENT
================================================================

[14:30:15] [CONFIG] Configurações validadas com sucesso
[14:30:15] [CONNECTION] Conectando ao servidor 172.16.2.35...
[14:30:17] [CONNECTION] Conexão estabelecida: \\172.16.2.35\app

[14:30:18] [MAINTENANCE] Ativando modo de manutenção...
[14:30:20] [MAINTENANCE] Flag de manutenção criada
[14:30:22] [MAINTENANCE] Nginx reiniciado (5 processos)

[14:30:23] [BACKEND] Parando processos Python...
[14:30:25] [BACKEND] 3 processos terminados

[14:30:26] [DEPLOY] Iniciando deployment de frontend...
[14:30:45] [DEPLOY] Frontend copiado: 1523 arquivos

[14:30:46] [DEPLOY] Iniciando deployment de backend...
[14:31:05] [DEPLOY] Backend copiado: 245 arquivos

[14:31:06] [BACKEND] Iniciando backend...
[14:31:12] [BACKEND] Backend iniciado - PID: 8432, Session: 2

[14:31:13] [MAINTENANCE] Desativando modo de manutenção...
[14:31:15] [MAINTENANCE] Nginx reiniciado (5 processos)

================================================================
                 DEPLOYMENT CONCLUÍDO COM SUCESSO
================================================================
```

## Configuração Avançada

### Timeouts e Tentativas

```powershell
$Global:DeployConfig.MaxTentativasConexao = 3
$Global:DeployConfig.TimeoutConexao = 5
$Global:DeployConfig.TimeoutOperacao = 30
```

### Gestão de Backups

```powershell
$Global:DeployConfig.CriarBackup = $true    # Criar backup antes do deploy
$Global:DeployConfig.ManterBackups = 5      # Manter últimos 5 backups
```

### Logging

```powershell
$Global:DeployConfig.VerboseLogging = $true
$Global:DeployConfig.LogFile = "C:\Users\rui.ramos\Desktop\APP\deployment.log"
```

Os logs incluem:
- Timestamp de cada operação
- Categoria da operação (CONFIG, CONNECTION, DEPLOY, BACKEND, etc.)
- Detalhes de erros e exceções
- PIDs e Session IDs de processos

## Troubleshooting

### Erro: "Falha ao conectar ao servidor"

**Causa:** Servidor não acessível ou credenciais inválidas

**Solução:**
```powershell
# Testar conectividade básica
Test-NetConnection -ComputerName 172.16.2.35 -Port 445

# Verificar compartilhamento
Test-Path "\\172.16.2.35\app"

# Testar credenciais
$cred = Get-DeployCredential
```

### Erro: "Backend não iniciou"

**Causa:** Script start.bat com problemas ou dependências em falta

**Solução:**
1. Verificar D:\APP\NewAPP\backend\start.bat no servidor
2. Verificar logs em D:\APP\NewAPP\deploy_log_*.txt
3. Testar manualmente:
   ```powershell
   .\Deploy-Main.ps1
   # Escolher opção 7 (Iniciar Backend)
   ```
4. Configurar `ShowBackendWindow = $true` para ver erros na janela

### Erro: "Nginx não responde"

**Causa:** Configuração nginx inválida ou porta 80 ocupada

**Solução:**
```powershell
# Verificar processos nginx
Get-Process -Name nginx -ErrorAction SilentlyContinue

# Testar porta 80
Test-NetConnection -ComputerName 172.16.2.35 -Port 80

# Ver configuração
Get-Content "\\172.16.2.35\app\NewAPP\nginx\conf\nginx.conf"
```

### Site preso em modo de manutenção

**Causa:** Flag de manutenção não foi removida

**Solução:**
```powershell
# Via deployment system
.\Deploy-Main.ps1 -DisableMaintenance

# Manual
Remove-Item "\\172.16.2.35\app\NewAPP\nginx\maintenance.flag" -Force
```

### Mais informações

Ver documentação adicional:
- [TROUBLESHOOTING-EXECUCAO-REMOTA.md](TROUBLESHOOTING-EXECUCAO-REMOTA.md) - Problemas de execução remota
- [TROUBLESHOOTING-WINRM.md](TROUBLESHOOTING-WINRM.md) - Problemas de WinRM (apenas informativo, v2.0 não usa WinRM)

## Estrutura de Arquivos

```
Deploy/
├── Deploy-Main.ps1                      # Script principal e menu interativo
├── DeployConfig.ps1                     # Configurações centralizadas
├── DeployConnection.ps1                 # Gestão de conexões SMB
├── DeployServerManager.ps1              # Gestão remota via Task Scheduler
├── DeployFrontend.ps1                   # Lógica de deployment frontend
├── DeployBackend.ps1                    # Lógica de deployment backend
├── DeployNginx.ps1                      # Gestão de nginx
├── DeployUI.ps1                         # Interface de usuário (menu)
├── DeployLogging.ps1                    # Sistema de logging
├── DeployValidation.ps1                 # Validações
├── Test-RemoteExecution.ps1             # Teste de execução remota
├── Test-RemoteCommands.ps1              # Teste de comandos específicos
├── Setup-CredSSP.ps1                    # Configuração CredSSP (legacy)
├── README.md                            # Esta documentação
├── README-EXECUCAO-REMOTA.md            # Doc execução remota
├── TROUBLESHOOTING-EXECUCAO-REMOTA.md   # Troubleshooting
└── TROUBLESHOOTING-WINRM.md             # Troubleshooting WinRM (legacy)
```

## Segurança

### Armazenamento de Credenciais

As credenciais são armazenadas usando `ConvertFrom-SecureString`, que:
- Encripta a senha usando DPAPI (Data Protection API) do Windows
- A senha só pode ser desencriptada pelo mesmo utilizador no mesmo computador
- O arquivo PServ.txt não pode ser usado em outro computador ou por outro utilizador

### Task Scheduler vs WinRM

| Aspecto | Task Scheduler (v2.0) | WinRM (v1.0) |
|---------|----------------------|--------------|
| Configuração | Simples | Complexa (GPO) |
| Porta necessária | 445 (SMB) | 5985/5986 |
| Segurança | Alta | Alta |
| Delegação | Não necessária | CredSSP requerido |
| Logs | D:\APP\NewAPP\deploy_log_*.txt | Event Viewer |

### Boas Práticas

1. **Limitar permissões** - O utilizador deve ter apenas as permissões necessárias
2. **Proteger PServ.txt** - Manter o arquivo de senha seguro
3. **Usar HTTPS** - Configurar nginx com SSL/TLS em produção
4. **Logs de auditoria** - Revisar deployment.log regularmente
5. **Backups regulares** - Manter `CriarBackup = $true`

## Comparação: v1.0 vs v2.0

| Característica | v1.0 (WinRM) | v2.0 (Task Scheduler) |
|----------------|--------------|----------------------|
| Configuração inicial | Complexa (WinRM, CredSSP, GPO) | Simples (apenas SMB) |
| Requisitos | WinRM habilitado, GPO configurada | Task Scheduler (padrão Windows) |
| Confiabilidade | Dependente de WinRM | Mais confiável (menos dependências) |
| Debug | Difícil (Event Viewer) | Fácil (logs em arquivo) |
| Janela do backend | Sempre Session 0 | Configurável (ShowBackendWindow) |
| Gestão de manutenção | Scripts .bat externos | PowerShell puro integrado |
| Verificação de processos | Básica | Detalhada (PID, Session ID) |

## Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para histórico completo de versões.

**v2.0** (2025-10-13)
- Migração de WinRM para Task Scheduler
- Reescrita de Enable/Disable-MaintenanceMode em PowerShell puro
- Adição de ShowBackendWindow para controle de visibilidade
- Logs melhorados com PID e Session ID
- Remoção de dependências de scripts .bat externos

**v1.0** (2025-10-09)
- Versão inicial com WinRM e CredSSP
- Uso de scripts .bat para manutenção
- Sistema modular básico

## Suporte

Para problemas ou dúvidas:

1. Verificar logs em: `C:\Users\rui.ramos\Desktop\APP\deployment.log`
2. Executar diagnóstico: `.\Deploy-Main.ps1` → Opção 11
3. Consultar troubleshooting guides
4. Verificar logs no servidor: `D:\APP\NewAPP\deploy_log_*.txt`

---

**Versão:** 2.0
**Data:** 2025-10-13
**Autor:** Sistema Modular
**Manutenção:** Rui Ramos
