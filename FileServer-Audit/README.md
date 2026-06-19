# Auditoria FileServer + Active Directory

Scripts de levantamento (apenas leitura — não alteram nada) para preparar a reorganização do fileserver e do AD. Pensado para ambiente pequeno (<25 utilizadores), Windows Server.

## Pré-requisitos

- **PowerShell 5.1+** (incluído no Windows Server 2016+)
- **Scripts 1 e 2**: Executar **no fileserver** como **Administrador local**
- **Script 3**: Executar num **Domain Controller** ou numa máquina com **RSAT** instalado (módulo `ActiveDirectory`)
- Permissões de leitura nas partilhas e no AD (contas de administrador de domínio cobrem tudo)

> **Nota sobre `LastLogonDate`**: O atributo `lastLogonTimestamp` (que alimenta `LastLogonDate`) tem um atraso de replicação de até 14 dias entre DCs. Em ambientes com múltiplos DCs, contas marcadas como "inativas" podem ter feito logon noutro DC recentemente. Com um único DC isto não é relevante.

Todos os scripts criam os CSVs em `.\Reports\`, com timestamp no nome.

| Script | Onde executar | O que faz |
|---|---|---|
| `1-Audit-FileServer.ps1` | No fileserver, como Administrador | Partilhas SMB, permissões de partilha, ACLs NTFS até 3 níveis + red flags |
| `2-Audit-Dados.ps1` | No fileserver, como Administrador | Tamanhos por pasta, dados "mortos" (>3 anos sem modificação), top extensões |
| `3-Audit-AD.ps1` | Num DC (ou máquina com RSAT) | OUs, grupos, memberships, higiene de contas + red flags |

```powershell
# Se a execução de scripts estiver bloqueada nesta sessão:
Set-ExecutionPolicy -Scope Process Bypass

.\1-Audit-FileServer.ps1 -Depth 3
.\2-Audit-Dados.ps1 -AnosAntigo 3
.\3-Audit-AD.ps1 -DiasInativo 90
```

## Como interpretar — red flags

### NTFS-Problemas.csv
- **UTILIZADOR_DIRETO** — utilizador colocado diretamente na ACL em vez de um grupo. É a causa nº 1 de caos: quando a pessoa sai ou muda de funções, ninguém se lembra de onde tem acesso. Corrigir com grupos.
- **HERANCA_QUEBRADA** — pasta com herança desativada. Aceitável em raízes de departamento; suspeito em subpastas profundas.
- **ACESSO_AMPLO_ESCRITA** — `Everyone`/`Authenticated Users`/`Users` com escrita. Quase sempre errado fora de uma pasta "Público".
- **ACE_ORFA** — SID sem resolução = conta apagada que ficou na ACL. Lixo a limpar.

### AD-Problemas.csv
- **ESTRUTURA** — objetos nos contentores default (`CN=Users`, `CN=Computers`). GPOs não se aplicam a contentores — mover para OUs.
- **CONTA** — contas ativas sem logon há meses ou que nunca fizeram logon. Desativar (não apagar já).
- **PASSWORD** — passwords que nunca expiram em contas de pessoas.
- **PRIVILEGIOS** — rever membros de Domain Admins & cª. Numa organização pequena devia ter 1–2 contas dedicadas (não as contas do dia-a-dia).
- **GRUPO** — grupos vazios antigos: candidatos a remoção.

## Próxima fase — modelo alvo (resumo)

Depois da auditoria, a reestruturação segue o modelo standard:

**1. Estrutura de pastas plana e por função:**
```
D:\Shares\
  ├── Departamentos\       (uma pasta por dept., acesso por grupo)
  ├── Comum\               (toda a gente lê/escreve)
  ├── Direcao\             (restrito)
  └── Arquivo\             (dados mortos, read-only)
```
Uma partilha por raiz (ou partilhas ocultas `$` por departamento) — não uma partilha por subpasta.

**2. Permissões via AGDLP:**
Conta → **G**rupo global (papel, ex: `GG_Contabilidade`) → grupo **D**omain **L**ocal (recurso, ex: `DL_FS_Contabilidade_RW`) → **P**ermissão NTFS no DL.

Para <25 users pode simplificar-se para um nível (grupo de domínio direto na ACL), mas **nunca** utilizadores diretos nas ACLs.

- Permissão de partilha: `Authenticated Users = Full Control`; o controlo real fica todo no NTFS (evita gerir dois sítios).
- Dois grupos por recurso: `_RW` (Modify) e `_RO` (Read). Nunca dar Full Control a utilizadores (permite mexer nas permissões).

**3. AD organizado:**
```
OU=Empresa
  ├── OU=Utilizadores
  ├── OU=Computadores
  ├── OU=Grupos
  └── OU=Servico        (contas de serviço)
```
GPOs úteis com pouco esforço: mapeamento de drives por grupo (Group Policy Preferences com item-level targeting), redirecionamento de pastas, política de passwords, wallpaper/bloqueio de ecrã.


**4. Migração sem dor:**
1. Criar a estrutura nova em paralelo (`D:\Shares-Novo`)
2. Criar grupos + aplicar ACLs limpas na estrutura vazia
3. Copiar dados com `robocopy /MIR /SEC /DCOPY:T /R:1 /W:1 /LOG:...` por departamento
4. Validar acessos com 1–2 utilizadores piloto
5. Cutover num fim de semana: re-mapear drives via GPO, partilha antiga fica read-only 30 dias, depois arquivo

Quando tiveres os CSVs, traz os resultados que desenhamos a estrutura concreta de pastas e grupos para o teu caso.
