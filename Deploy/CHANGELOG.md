# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2025-10-13

### Mudanças Significativas (Breaking Changes)

- **MIGRAÇÃO: WinRM → Task Scheduler**
  - Removida dependência de WinRM e CredSSP
  - Sistema agora utiliza Task Scheduler para execução remota
  - Não requer mais configuração de Group Policy para CredSSP
  - Porta necessária alterada de 5985/5986 (WinRM) para 445 (SMB)

### Adicionado

- **Nova função:** `Invoke-RemoteServerCommand-TaskScheduler` em DeployServerManager.ps1
  - Execução remota via `schtasks.exe`
  - Criação, execução e limpeza automática de Scheduled Tasks
  - Logs de execução salvos em D:\APP\NewAPP\deploy_log_*.txt
  - Suporte a passagem de argumentos via `$args` array

- **Configuração:** `ShowBackendWindow` em DeployConfig.ps1
  - `$true` - Abre janela visível do backend (ideal para DEBUG)
  - `$false` - Backend roda em background (ideal para PRODUÇÃO)
  - Permite visualização de logs do backend durante desenvolvimento

- **Scripts de teste:**
  - `Test-RemoteExecution.ps1` - Teste completo de Task Scheduler
  - `Test-RemoteCommands.ps1` - Teste de comandos específicos de deployment

- **Documentação:**
  - README.md completo com diagramas de arquitetura
  - README-EXECUCAO-REMOTA.md - Guia de execução remota
  - TROUBLESHOOTING-EXECUCAO-REMOTA.md - Guia de troubleshooting
  - TROUBLESHOOTING-WINRM.md - Documentação legacy de WinRM
  - Este CHANGELOG.md

- **Verificação de processos melhorada:**
  - Logs agora incluem PID (Process ID)
  - Logs incluem Session ID dos processos
  - Verificação de que processos realmente iniciaram após Start-Process

### Modificado

- **DeployServerManager.ps1 - Reescrita completa:**
  - `Enable-MaintenanceMode` - Agora em PowerShell puro (não usa .bat)
    - Cria maintenance.flag diretamente
    - Controla nginx via Stop-Process e Start-Process
    - Verifica que nginx reiniciou com sucesso

  - `Disable-MaintenanceMode` - Agora em PowerShell puro (não usa .bat)
    - Remove maintenance.flag diretamente
    - Controla nginx via Stop-Process e Start-Process
    - Verifica que nginx reiniciou com sucesso

  - `Stop-BackendProcess` - Melhorado
    - Enumera todos os processos Python antes de terminar
    - Verifica que processos realmente pararam
    - Log detalhado de cada processo terminado

  - `Start-BackendProcess` - Melhorado
    - Suporte a WindowStyle configurável (Normal ou Hidden)
    - Verifica que backend iniciou após Start-Process
    - Log de PID e Session ID do processo criado
    - Timeout de verificação aumentado para garantir inicialização

- **DeployConfig.ps1 - Limpeza e simplificação:**
  - Removido: `UseCredSSP` (não mais necessário)
  - Removido: `EnableMaintenanceScriptPath` (não usa mais .bat)
  - Removido: `DisableMaintenanceScriptPath` (não usa mais .bat)
  - Adicionado: Cabeçalho com versão e data
  - Adicionado: Comentários PowerShell Help (.SYNOPSIS, .DESCRIPTION, .OUTPUTS)
  - Simplificado: RemoteManagement agora tem apenas 3 propriedades essenciais

- **Sistema de logging:**
  - Logs agora incluem informação de Session ID
  - Logs incluem PIDs de processos iniciados/terminados
  - Melhor formatação e categorização de mensagens

### Removido

- **Dependências de WinRM:**
  - Código de autenticação CredSSP
  - Código de autenticação Negotiate
  - Função `Invoke-RemoteServerCommand-WinRM` (mantida como fallback comentado)

- **Dependências de scripts .bat:**
  - Chamadas a ativar_manutencao.bat
  - Chamadas a desativar_manutencao.bat
  - Workarounds para comando `pause` em .bat scripts

- **Configurações obsoletas:**
  - `UseCredSSP` de DeployConfig.ps1
  - `EnableMaintenanceScriptPath` de DeployConfig.ps1
  - `DisableMaintenanceScriptPath` de DeployConfig.ps1

### Corrigido

- **Problema:** Scripts .bat com `pause` travavam execução remota
  - **Solução:** Reescritas funções em PowerShell puro, eliminando .bat

- **Problema:** Backend iniciava em Session 0 (invisível) mesmo em desenvolvimento
  - **Solução:** Adicionado `ShowBackendWindow` para controle de visibilidade

- **Problema:** Processos não eram verificados após iniciar/parar
  - **Solução:** Adicionada verificação com Get-Process após cada operação

- **Problema:** `param()` em scriptblocks causava erro "term 'param' is not recognized"
  - **Solução:** Regex para remover `param()` e usar `$args` array

- **Problema:** Argumentos não eram passados corretamente para scripts remotos
  - **Solução:** Injeção de `$args` array no início do scriptblock

- **Problema:** Scheduled Tasks não eram criadas devido a formatação incorreta
  - **Solução:** Uso de array de argumentos em vez de string concatenada

- **Problema:** Logs de erro vazios quando Task creation falhava
  - **Solução:** Captura de stderr com `2>&1` e logging detalhado

### Segurança

- **Melhorado:** Eliminação de CredSSP reduz superfície de ataque
  - Task Scheduler não requer delegação de credenciais
  - Menor risco de credential replay attacks

- **Melhorado:** Logs de execução remota agora ficam no servidor
  - Auditoria completa de comandos executados
  - Logs em D:\APP\NewAPP\deploy_log_*.txt

### Performance

- **Melhorado:** Conexões mais rápidas
  - Task Scheduler tem overhead menor que WinRM
  - Eliminação de handshake CredSSP

- **Melhorado:** Menos dependências
  - Não requer WinRM service ativo
  - Não requer configuração prévia de servidor

### Documentação

- **Adicionado:** Diagramas de arquitetura ASCII no README
- **Adicionado:** Fluxograma completo de deployment
- **Adicionado:** Tabelas comparativas v1.0 vs v2.0
- **Adicionado:** Seção de segurança detalhada
- **Adicionado:** Guias de troubleshooting específicos
- **Melhorado:** Exemplos de uso com output esperado

## [1.0.0] - 2025-10-09

### Adicionado

- Sistema modular de deployment inicial
- Arquitetura baseada em módulos PowerShell:
  - Deploy-Main.ps1 - Orquestrador principal
  - DeployConfig.ps1 - Configurações centralizadas
  - DeployConnection.ps1 - Gestão de conexões
  - DeployServerManager.ps1 - Gestão de servidor remoto
  - DeployFrontend.ps1 - Deployment de React
  - DeployBackend.ps1 - Deployment de Python
  - DeployNginx.ps1 - Gestão de nginx
  - DeployUI.ps1 - Interface de menu
  - DeployLogging.ps1 - Sistema de logging
  - DeployValidation.ps1 - Validações

- Funcionalidades core:
  - Deploy automatizado de frontend React
  - Deploy automatizado de backend Python
  - Modo de manutenção via scripts .bat
  - Sistema de backups com rotação
  - Logging estruturado
  - Menu interativo

- Execução remota via WinRM:
  - Suporte a autenticação CredSSP
  - Suporte a autenticação Negotiate
  - Função `Invoke-RemoteServerCommand-WinRM`

- Scripts de manutenção:
  - ativar_manutencao.bat no servidor
  - desativar_manutencao.bat no servidor
  - Sistema de maintenance.flag

- Gestão de conexões:
  - Classe ServerConnection em PowerShell
  - Retry automático com backoff exponencial
  - Validação de conexão antes de operações

- Interface de usuário:
  - Menu interativo com 12 opções
  - Modo não-interativo via parâmetros
  - Feedback visual colorido

### Limitações Conhecidas (v1.0)

- **Requer WinRM configurado** no servidor remoto
- **Requer CredSSP** para funcionar corretamente
- **Requer Group Policy** configurada para delegação
- Scripts .bat com `pause` causam problemas (não resolvido em v1.0)
- Backend sempre inicia em Session 0 (sem opção de janela visível)
- Logs de execução remota apenas em Event Viewer (difícil debug)

---

## Formato das Entradas

### Tipos de Mudanças

- **Adicionado** - Para novas funcionalidades
- **Modificado** - Para mudanças em funcionalidades existentes
- **Descontinuado** - Para funcionalidades que serão removidas
- **Removido** - Para funcionalidades removidas
- **Corrigido** - Para correções de bugs
- **Segurança** - Para questões de segurança

### Estrutura de Versão

Este projeto usa [Semantic Versioning](https://semver.org/):
- **MAJOR** (X.0.0) - Mudanças incompatíveis na API
- **MINOR** (0.X.0) - Novas funcionalidades compatíveis
- **PATCH** (0.0.X) - Correções de bugs compatíveis

---

**Nota:** Versões anteriores a 1.0.0 não foram documentadas formalmente.
