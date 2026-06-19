<#
.SYNOPSIS
    Criar estrutura de OUs e mover objetos para as OUs corretas.
.DESCRIPTION
    Cria a nova estrutura de OUs alinhada com o organograma da AINTAR
    e move utilizadores, computadores e grupos para as OUs corretas.
    Executar num DC ou maquina com RSAT, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\5-Create-OUs.ps1 -WhatIf   # Simula
    .\5-Create-OUs.ps1            # Executa
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Create-OUs_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

$domainDN = (Get-ADDomain).DistinguishedName
$baseDN   = "OU=Aintar,$domainDN"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Ensure-OU {
    param([string]$Name, [string]$Path, [string]$Description = '')
    $dn = "OU=$Name,$Path"
    if (Get-ADOrganizationalUnit -Filter "DistinguishedName -eq '$dn'" -ErrorAction SilentlyContinue) {
        Log "[OK]   OU ja existe: $dn"
        return
    }
    if ($PSCmdlet.ShouldProcess($dn, "Criar OU")) {
        New-ADOrganizationalUnit -Name $Name -Path $Path -Description $Description -ProtectedFromAccidentalDeletion $true
        Log "[NOVO] OU criada: $dn"
    }
}

Write-Host "=== Criar Estrutura de OUs -- AINTAR ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# 1. Criar OUs
# ---------------------------------------------------------------
Write-Host "[1/3] A criar OUs..." -ForegroundColor Yellow

# Nivel 1 -- debaixo de OU=Aintar (ja existe)
Ensure-OU -Name 'Utilizadores' -Path $baseDN -Description 'Contas de utilizadores por departamento'
Ensure-OU -Name 'Computadores'  -Path $baseDN -Description 'Computadores e servidores do dominio'
Ensure-OU -Name 'Admin'         -Path $baseDN -Description 'Contas administrativas dedicadas'

# Nivel 2 -- Utilizadores por departamento
$utilizadoresDN = "OU=Utilizadores,$baseDN"
Ensure-OU -Name 'Direcao'  -Path $utilizadoresDN -Description 'Direcao, Secretariado, Fiscalizacao, Juridico'
Ensure-OU -Name 'DPAS'     -Path $utilizadoresDN -Description 'Div. Projetos, Ambiente e Saneamento'
Ensure-OU -Name 'DAGF'     -Path $utilizadoresDN -Description 'Div. Administracao Geral e Financas'
Ensure-OU -Name 'TI'       -Path $utilizadoresDN -Description 'Sistemas e Tecnologias de Informacao'
Ensure-OU -Name 'Servico'  -Path $utilizadoresDN -Description 'Contas de servico (svc.*)'

# Nivel 2 -- Computadores
$computadoresDN = "OU=Computadores,$baseDN"
Ensure-OU -Name 'Desktops'   -Path $computadoresDN -Description 'Estacoes de trabalho'
Ensure-OU -Name 'Servidores' -Path $computadoresDN -Description 'Servidores'

# Nivel 2 -- Grupos (ja existe OU=Groups, vamos criar sub-OUs)
$gruposDN = "OU=Groups,$baseDN"
Ensure-OU -Name 'FileServer' -Path $gruposDN -Description 'Grupos de acesso ao FileServer (SG_FS_*)'
Ensure-OU -Name 'Acesso'     -Path $gruposDN -Description 'Grupos de acesso VPN, RDP, etc.'
Ensure-OU -Name 'Servicos'   -Path $gruposDN -Description 'Grupos de servicos (ADSync, Sophos)'

# ---------------------------------------------------------------
# 2. Mover utilizadores para OUs por departamento
# ---------------------------------------------------------------
Write-Host "[2/3] A mover utilizadores..." -ForegroundColor Yellow

$moveMap = @(
    # Direcao
    @{ Conta = 'ricardosousa';        OU = "OU=Direcao,$utilizadoresDN" },
    @{ Conta = 'claudiasantos';       OU = "OU=Direcao,$utilizadoresDN" },
    @{ Conta = 'auditor';             OU = "OU=Direcao,$utilizadoresDN" },
    @{ Conta = 'pedropatricio';       OU = "OU=Direcao,$utilizadoresDN" },
    @{ Conta = 'alexandrapinto';      OU = "OU=Direcao,$utilizadoresDN" },

    # DPAS
    @{ Conta = 'luispedro';           OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'patriciacosta';       OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'dianaloio';           OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'pedrodinis';          OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'inescaeiro';          OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'americoferreira';     OU = "OU=DPAS,$utilizadoresDN" },
    @{ Conta = 'nunosousa';           OU = "OU=DPAS,$utilizadoresDN" },

    # DAGF
    @{ Conta = 'anarita';             OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'vaniatrovao';         OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'claudiamarques';      OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'monicafigueiredo';    OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'josemelo';            OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'karinecosta';         OU = "OU=DAGF,$utilizadoresDN" },
    @{ Conta = 'tiagomatos';          OU = "OU=DAGF,$utilizadoresDN" },

    # TI
    @{ Conta = 'rui.ramos';           OU = "OU=TI,$utilizadoresDN" },
    @{ Conta = 'guilhermefigueiredo'; OU = "OU=TI,$utilizadoresDN" },

    # Servico
    @{ Conta = 'ScannerRicoh';        OU = "OU=Servico,$utilizadoresDN" },
    @{ Conta = 'fortinet';            OU = "OU=Servico,$utilizadoresDN" },
    @{ Conta = 'ADSync';              OU = "OU=Servico,$utilizadoresDN" },

    # Admin (contas admin existentes que devem ficar em OU=Admin)
    @{ Conta = 'aintar.admin';        OU = "OU=Admin,$baseDN" },
    @{ Conta = 'officelan.admin';     OU = "OU=Admin,$baseDN" }
)

# Mover contas do contentor CN=Users para OUs
foreach ($item in $moveMap) {
    try {
        $user = Get-ADUser -Identity $item.Conta
        $currentOU = ($user.DistinguishedName -split ',', 2)[1]
        $targetOU  = $item.OU

        if ($currentOU -eq $targetOU) {
            Log "[OK]   '$($item.Conta)' ja esta em $targetOU"
            continue
        }

        if ($PSCmdlet.ShouldProcess("$($item.Conta) -> $targetOU", "Mover utilizador")) {
            Move-ADObject -Identity $user.DistinguishedName -TargetPath $targetOU
            Log "[MOVE] '$($item.Conta)' movido de $currentOU para $targetOU"
        }
    } catch {
        Log "[ERRO] '$($item.Conta)': $($_.Exception.Message)"
    }
}

# ---------------------------------------------------------------
# 3. Mover computadores de CN=Computers para OU
# ---------------------------------------------------------------
Write-Host "[3/3] A mover computadores..." -ForegroundColor Yellow

$desktopsDN   = "OU=Desktops,$computadoresDN"
$servidoresDN = "OU=Servidores,$computadoresDN"

# Mover servidores
$servidores = @('SRV-FS-01$', 'SRV-RDP-01$', 'SRV-DB-01$', 'SRV-IIS-01$', 'SRV-EXTRA-01$')
foreach ($srv in $servidores) {
    try {
        $comp = Get-ADComputer -Identity ($srv -replace '\$$','')
        $currentOU = ($comp.DistinguishedName -split ',', 2)[1]
        if ($currentOU -eq $servidoresDN) {
            Log "[OK]   '$srv' ja esta em Servidores"
            continue
        }
        if ($PSCmdlet.ShouldProcess($srv, "Mover para OU=Servidores")) {
            Move-ADObject -Identity $comp.DistinguishedName -TargetPath $servidoresDN
            Log "[MOVE] '$srv' movido para OU=Servidores"
        }
    } catch {
        Log "[AVISO] Servidor '$srv' nao encontrado ou erro: $($_.Exception.Message)"
    }
}

# Mover todos os PCs do contentor default para OU=Desktops
$defaultComputersDN = "CN=Computers,$domainDN"
$pcs = Get-ADComputer -SearchBase $defaultComputersDN -SearchScope OneLevel -Filter * -ErrorAction SilentlyContinue
foreach ($pc in $pcs) {
    if ($PSCmdlet.ShouldProcess($pc.Name, "Mover para OU=Desktops")) {
        try {
            Move-ADObject -Identity $pc.DistinguishedName -TargetPath $desktopsDN
            Log "[MOVE] PC '$($pc.Name)' movido para OU=Desktops"
        } catch {
            Log "[ERRO] PC '$($pc.Name)': $($_.Exception.Message)"
        }
    }
}

# Mover servidores da OU=Servers antiga (se existir)
$oldServersDN = "OU=Servers,$baseDN"
if (Get-ADOrganizationalUnit -Filter "DistinguishedName -eq '$oldServersDN'" -ErrorAction SilentlyContinue) {
    $oldSrvs = Get-ADComputer -SearchBase $oldServersDN -SearchScope OneLevel -Filter * -ErrorAction SilentlyContinue
    foreach ($s in $oldSrvs) {
        if ($PSCmdlet.ShouldProcess($s.Name, "Mover de Servers antigo para OU=Servidores")) {
            try {
                Move-ADObject -Identity $s.DistinguishedName -TargetPath $servidoresDN
                Log "[MOVE] Servidor '$($s.Name)' movido de OU=Servers para OU=Servidores"
            } catch {
                Log "[ERRO] '$($s.Name)': $($_.Exception.Message)"
            }
        }
    }
}

Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
