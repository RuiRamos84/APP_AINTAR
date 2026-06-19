# Integração com Microsoft 365 / Entra ID (Microsoft Entra Connect)

Guia de apoio — esta parte não é scriptável de forma segura (instalação/configuração
faz-se através do wizard do Entra Connect, num servidor membro do domínio). Este
documento define **quando** e **como** encaixar esta integração na reorganização do AD.

## Antes de tudo: o que são `ADSync`, `Off365Sync`, `MSOL_19c20b45ddbd`?

Estas três contas no AD são tipicamente criadas por uma instalação **anterior** do
Azure AD Connect / DirSync:
- `MSOL_19c20b45ddbd` — conta de serviço criada automaticamente pelo Entra Connect
  para autenticação contra o Entra ID (criada na OU `CN=Users`, password gerida
  automaticamente, rotação a cada ~30 dias).
- `ADSync` / `Off365Sync` — provavelmente contas usadas por uma instalação antiga
  ou descontinuada (nomes diferentes sugerem possivelmente duas tentativas/versões).

Como confirmaste que **não está configurado agora**, é muito provável que exista
uma instalação **órfã/desligada** — ou seja, foi instalado em algum servidor, talvez
desinstalado sem limpar as contas de serviço no AD. **Antes de instalar uma nova
instância**, vale a pena confirmar:

```powershell


# Procurar o servidor onde o Entra Connect possa estar/ter estado instalado
Get-ADComputer -Filter * | Where-Object { $_.Name -match 'AAD|AADC|SYNC|CONNECT' }

# No servidor candidato, verificar se o serviço existe (mesmo parado)
Get-Service -Name "ADSync" -ErrorAction SilentlyContinue
Get-ScheduledTask -TaskName "*AzureAD*" -ErrorAction SilentlyContinue
```

Se encontrares uma instalação antiga (mesmo parada), o recomendado é **desinstalar
corretamente** (painel de controlo → Microsoft Azure AD Connect → desinstalar) antes
de instalar uma nova — evita conflitos de "hard match" / "soft match" de objetos
já existentes no Entra ID com SIDs/ImmutableIDs antigos.

As contas `MSOL_*` e `ADSync`/`Off365Sync` **não devem ser apagadas** sem primeiro
confirmar isto — já estão corretamente listadas como "contas de serviço" nos
scripts 6/8 (não entram em `_RW`/`_RO` nem em PasswordPolicy) e o script 4
(`4-Disable-Accounts.ps1`) já as desativa como parte da limpeza geral. Está OK
manter assim por agora; se decidires desinstalar uma instalação antiga, o próprio
desinstalador remove a conta `MSOL_*` correspondente.

## Ordem recomendada: AD primeiro, Entra Connect depois

A reorganização de OUs/grupos (scripts 5–6) **não tem de esperar** pelo Entra
Connect — mas o **âmbito de sincronização** do Entra Connect deve ser configurado
**depois** de a estrutura de OUs estar pronta, para já cobrir `OU=Aintar` completa
desde o início. Ordem sugerida:

1. Scripts 4 → 9 (conforme já planeado: desativar contas, criar OUs, mover
   utilizadores/computadores, configurar grupos, contas admin, política de
   passwords, fileserver).
2. **Limpeza/validação de instalação antiga do Entra Connect** (passo acima).
3. **Instalar Microsoft Entra Connect** (passo seguinte).
4. Validar sincronização e licenciamento M365 dos utilizadores.

## Pré-requisitos para instalar o Entra Connect

- **Servidor**: um servidor membro do domínio (Windows Server 2016+), **não precisa
  de ser um DC** — recomendado correr num servidor dedicado ou no próprio fileserver
  se tiver recursos sobrantes (Entra Connect é leve para <25 users).
- **Conta de instalação**: um Domain Admin (podes usar `adm.rui.ramos` depois de
  criado pelo script 7) — não precisa de ficar com privilégios elevados depois,
  só durante a instalação.
- **Conta Global Administrator no Microsoft 365/Entra ID** — para autorizar a
  ligação na primeira configuração (pede para teres uma conta cloud-only dedicada
  para isto, ex: `admin@aintar.onmicrosoft.com`, não uma conta de utilizador normal).
- **Domínio verificado no Entra ID**: confirmar em
  `Entra Admin Center → Identity → Settings → Domain names` que `aintar.pt` (ou o
  domínio UPN usado) está **Verified**. Se os UPNs dos utilizadores não usarem este
  domínio, define `-UserPrincipalName` correto antes de sincronizar (ver abaixo).
- **UPN dos utilizadores no AD**: o atributo `userPrincipalName` de cada conta tem
  de corresponder a um domínio verificado no Entra ID (ex: `rui.ramos@aintar.pt`).
  Vale a pena confirmar/corrigir antes de sincronizar:
  ```powershell
  Get-ADUser -Filter * -SearchBase "OU=Utilizadores,OU=Aintar,$((Get-ADDomain).DistinguishedName)" `
    -Properties UserPrincipalName | Select-Object SamAccountName, UserPrincipalName
  ```

## Configuração do âmbito de sincronização (o ponto crítico)

Durante o wizard do Entra Connect, em **"Domain and OU filtering"**:
- Escolher **"Sync selected domains and OUs"**.
- Marcar:
  - `OU=Utilizadores,OU=Aintar,...` (todos os departamentos)
  - `OU=Admin,OU=Aintar,...` **só se** quiseres que `adm.rui.ramos`/`adm.ricardosousa`
    também tenham contas cloud (geralmente não — contas admin dedicadas costumam
    ficar **on-prem only**, sem licença M365, por segurança).
- **Não marcar** `OU=Servico` (contas de serviço como `ScannerRicoh`, `fortinet`,
  `ADSync` não precisam de existir no Entra ID).
- **Não marcar** `OU=Computadores` (objetos de computador não são necessários no
  Entra ID para este caso de uso).

Isto significa: faz a configuração do âmbito **depois** de o script 5 já ter
movido os utilizadores para `OU=Utilizadores\{Direcao,DPAS,DAGF,TI,Servico}` —
caso contrário tens de voltar ao wizard para ajustar o âmbito quando os moveres.

## Depois de instalado

- Primeira sincronização pode demorar — corre `Start-ADSyncSyncCycle -PolicyType Delta`
  para forçar.
- Confirmar no **Entra Admin Center → Identity → Users** que os utilizadores
  aparecem com "On-premises sync enabled = Yes" e o atributo correto.
- Atribuir licenças M365 (grupo de segurança com licença atribuída via
  "Group-based licensing" é o mais simples — podes reaproveitar um grupo
  transversal como base, ou criar `SG_M365_USERS`).
- **Hybrid password writeback** (opcional): permite que alterações de password
  feitas no portal M365 sejam escritas de volta no AD on-prem. Útil para
  reduzir chamadas de "esqueci a password".

## O que NÃO mexer nos scripts existentes

Os scripts 4–9 já estão corretos para esta integração — não precisam de
alterações para suportar o Entra Connect. A única dependência é de **sequência**:
corre 4→9 primeiro, depois trata da instalação do Entra Connect conforme este guia.
