<#
.SYNOPSIS
    Criar e configurar grupos de seguranca do FileServer com memberships corretos.
.DESCRIPTION
    Cria novos grupos, limpa memberships dos existentes e repopula segundo
    o organograma validado. Usa nested groups (_RW dentro de _RO).
    Executar num DC ou maquina com RSAT, como Domain Admin.
.PARAMETER WhatIf
    Se presente, mostra o que faria sem executar.
.EXAMPLE
    .\6-Configure-Groups.ps1 -WhatIf
    .\6-Configure-Groups.ps1
#>


#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $PSScriptRoot "Reports\Configure-Groups_$stamp.log"
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot 'Reports') -Force | Out-Null

$domainDN = (Get-ADDomain).DistinguishedName
$gruposDN = "OU=SecurityGroups,OU=Groups,OU=Aintar,$domainDN"

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Ensure-Group {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Description,
        [string]$Scope = 'Global',
        [string]$Category = 'Security'
    )
    $existing = Get-ADGroup -Filter "Name -eq '$Name'" -ErrorAction SilentlyContinue
    if ($existing) {
        Log "[OK]   Grupo ja existe: $Name"
        # Atualizar descricao se necessario
        if ($Description -and $existing.Description -ne $Description) {
            Set-ADGroup -Identity $Name -Description $Description
        }
        return
    }
    if ($PSCmdlet.ShouldProcess($Name, "Criar grupo de seguranca")) {
        New-ADGroup -Name $Name -Path $Path -GroupScope $Scope -GroupCategory $Category -Description $Description
        Log "[NOVO] Grupo criado: $Name ($Scope, $Category)"
    }
}

function Set-GroupMembers {
    param(
        [string]$GroupName,
        [string[]]$Members
    )
    Log "[---]  A configurar membros de '$GroupName'..."

    # Obter membros atuais
    $current = @(Get-ADGroupMember -Identity $GroupName -ErrorAction SilentlyContinue | ForEach-Object { $_.SamAccountName })

    # Remover membros que nao deviam estar
    foreach ($m in $current) {
        if ($m -notin $Members) {
            if ($PSCmdlet.ShouldProcess("$m de $GroupName", "Remover membro")) {
                try {
                    Remove-ADGroupMember -Identity $GroupName -Members $m -Confirm:$false
                    Log "       [-] Removido '$m' de '$GroupName'"
                } catch {
                    Log "       [ERRO] Remover '$m': $($_.Exception.Message)"
                }
            }
        }
    }

    # Adicionar membros em falta
    foreach ($m in $Members) {
        if ($m -notin $current) {
            if ($PSCmdlet.ShouldProcess("$m a $GroupName", "Adicionar membro")) {
                try {
                    # Tentar como utilizador primeiro, depois como grupo
                    $obj = Get-ADUser -Filter "SamAccountName -eq '$m'" -ErrorAction SilentlyContinue
                    if (-not $obj) {
                        $obj = Get-ADGroup -Filter "Name -eq '$m'" -ErrorAction SilentlyContinue
                    }
                    if ($obj) {
                        Add-ADGroupMember -Identity $GroupName -Members $obj
                        Log "       [+] Adicionado '$m' a '$GroupName'"
                    } else {
                        Log "       [AVISO] '$m' nao encontrado no AD"
                    }
                } catch {
                    Log "       [ERRO] Adicionar '$m': $($_.Exception.Message)"
                }
            }
        }
    }
}

Write-Host "=== Configurar Grupos de Seguranca -- AINTAR ===" -ForegroundColor Cyan
Write-Host ""

# -- Todos os utilizadores ativos (para grupos transversais) --
$todosAtivos = @(
    'ricardosousa', 'claudiasantos', 'auditor', 'pedropatricio', 'alexandrapinto',
    'luispedro', 'patriciacosta', 'dianaloio', 'pedrodinis', 'inescaeiro',
    'americoferreira', 'nunosousa',
    'anarita', 'vaniatrovao', 'claudiamarques', 'monicafigueiredo',
    'josemelo', 'karinecosta', 'tiagomatos',
    'rui.ramos', 'guilhermefigueiredo'
)

# ---------------------------------------------------------------
# 1. Criar grupos que faltam
# ---------------------------------------------------------------
Write-Host "[1/2] A criar grupos..." -ForegroundColor Yellow

$gruposNovos = @(
    # Transversais
    @{ Name = 'SG_FS_COMUM_RW';           Desc = 'Pasta Comum -- todos com escrita' },
    @{ Name = 'SG_FS_SCANNER_RW';         Desc = 'Pasta Scanner -- todos com escrita' },

    # Direcao
    @{ Name = 'SG_FS_DIR_RW';             Desc = 'Direcao -- leitura e escrita' },
    @{ Name = 'SG_FS_DIR_RO';             Desc = 'Direcao -- apenas leitura' },

    # Juridico
    @{ Name = 'SG_FS_JURIDICO_RW';        Desc = 'Gabinete Juridico -- leitura e escrita' },
    @{ Name = 'SG_FS_JURIDICO_RO';        Desc = 'Gabinete Juridico -- apenas leitura' },

    # DAGF
    @{ Name = 'SG_FS_DAGF_RW';            Desc = 'DAGF Geral -- leitura e escrita' },
    @{ Name = 'SG_FS_DAGF_RO';            Desc = 'DAGF Geral -- apenas leitura' },
    @{ Name = 'SG_FS_CONTABILIDADE_RW';   Desc = 'Contabilidade e Faturacao -- leitura e escrita' },
    @{ Name = 'SG_FS_CONTABILIDADE_RO';   Desc = 'Contabilidade e Faturacao -- apenas leitura' },
    @{ Name = 'SG_FS_RH_RW';              Desc = 'Recursos Humanos -- leitura e escrita' },
    @{ Name = 'SG_FS_RH_RO';              Desc = 'Recursos Humanos -- apenas leitura' },
    @{ Name = 'SG_FS_ATENDIMENTO_RW';     Desc = 'Atendimento ao Publico -- leitura e escrita' },
    @{ Name = 'SG_FS_ATENDIMENTO_RO';     Desc = 'Atendimento ao Publico -- apenas leitura' },
    @{ Name = 'SG_FS_FROTA_RW';           Desc = 'Frota, Logistica e Armazens -- leitura e escrita' },
    @{ Name = 'SG_FS_FROTA_RO';           Desc = 'Frota, Logistica e Armazens -- apenas leitura' },
    @{ Name = 'SG_FS_APROVISIONAMENTO_RW'; Desc = 'Aprovisionamento e Contratacao -- leitura e escrita' },
    @{ Name = 'SG_FS_APROVISIONAMENTO_RO'; Desc = 'Aprovisionamento e Contratacao -- apenas leitura' },

    # DPAS
    @{ Name = 'SG_FS_DPAS_RW';            Desc = 'DPAS Geral -- leitura e escrita' },
    @{ Name = 'SG_FS_DPAS_RO';            Desc = 'DPAS Geral -- apenas leitura' },
    @{ Name = 'SG_FS_AMBIENTE_RW';         Desc = 'Ambiente e Qualidade da Agua -- leitura e escrita' },
    @{ Name = 'SG_FS_AMBIENTE_RO';         Desc = 'Ambiente e Qualidade da Agua -- apenas leitura' },
    @{ Name = 'SG_FS_PROJ_RW';            Desc = 'Projetos e Empreitadas -- leitura e escrita' },
    @{ Name = 'SG_FS_PROJ_RO';            Desc = 'Projetos e Empreitadas -- apenas leitura' },
    @{ Name = 'SG_FS_OPERACAO_RW';         Desc = 'Operacao e Manutencao -- leitura e escrita' },
    @{ Name = 'SG_FS_OPERACAO_RO';         Desc = 'Operacao e Manutencao -- apenas leitura' },
    @{ Name = 'SG_FS_LICENCIAMENTO_RW';    Desc = 'Licenciamento e Fiscalizacao -- leitura e escrita' },
    @{ Name = 'SG_FS_LICENCIAMENTO_RO';    Desc = 'Licenciamento e Fiscalizacao -- apenas leitura' },

    # TI
    @{ Name = 'SG_FS_TI_RW';              Desc = 'Sistemas TI -- leitura e escrita' }
)

foreach ($g in $gruposNovos) {
    Ensure-Group -Name $g.Name -Path $gruposDN -Description $g.Desc
}

# ---------------------------------------------------------------
# 2. Configurar memberships
# ---------------------------------------------------------------
Write-Host "[2/2] A configurar memberships..." -ForegroundColor Yellow

# -- Transversais --
Set-GroupMembers -GroupName 'SG_FS_COMUM_RW'   -Members $todosAtivos
Set-GroupMembers -GroupName 'SG_FS_SCANNER_RW'  -Members $todosAtivos

# -- Direcao --
Set-GroupMembers -GroupName 'SG_FS_DIR_RW'  -Members @('ricardosousa', 'claudiasantos')
Set-GroupMembers -GroupName 'SG_FS_DIR_RO'  -Members @('SG_FS_DIR_RW', 'auditor', 'pedropatricio')

# -- Juridico --
Set-GroupMembers -GroupName 'SG_FS_JURIDICO_RW' -Members @('alexandrapinto')
Set-GroupMembers -GroupName 'SG_FS_JURIDICO_RO' -Members @('SG_FS_JURIDICO_RW', 'ricardosousa', 'claudiasantos')

# -- DAGF Geral --
$dagfTodos = @('anarita', 'vaniatrovao', 'claudiamarques', 'monicafigueiredo', 'josemelo', 'karinecosta', 'tiagomatos')
Set-GroupMembers -GroupName 'SG_FS_DAGF_RW' -Members $dagfTodos
Set-GroupMembers -GroupName 'SG_FS_DAGF_RO' -Members @('SG_FS_DAGF_RW', 'ricardosousa', 'claudiasantos', 'auditor')

# -- Contabilidade (inclui Faturacao) --
Set-GroupMembers -GroupName 'SG_FS_CONTABILIDADE_RW' -Members @('anarita', 'vaniatrovao', 'claudiamarques')
Set-GroupMembers -GroupName 'SG_FS_CONTABILIDADE_RO' -Members @('SG_FS_CONTABILIDADE_RW', 'ricardosousa', 'auditor')

# -- RH --
Set-GroupMembers -GroupName 'SG_FS_RH_RW' -Members @('monicafigueiredo')
Set-GroupMembers -GroupName 'SG_FS_RH_RO' -Members @('SG_FS_RH_RW', 'ricardosousa', 'claudiasantos')

# -- Atendimento --
Set-GroupMembers -GroupName 'SG_FS_ATENDIMENTO_RW' -Members @('karinecosta', 'tiagomatos')
Set-GroupMembers -GroupName 'SG_FS_ATENDIMENTO_RO' -Members @('SG_FS_ATENDIMENTO_RW', 'ricardosousa')

# -- Frota/Logistica --
Set-GroupMembers -GroupName 'SG_FS_FROTA_RW' -Members @('josemelo')
Set-GroupMembers -GroupName 'SG_FS_FROTA_RO' -Members @('SG_FS_FROTA_RW', 'ricardosousa', 'americoferreira')

# -- Aprovisionamento --
Set-GroupMembers -GroupName 'SG_FS_APROVISIONAMENTO_RW' -Members @('vaniatrovao')
Set-GroupMembers -GroupName 'SG_FS_APROVISIONAMENTO_RO' -Members @('SG_FS_APROVISIONAMENTO_RW', 'ricardosousa', 'auditor')

# -- DPAS Geral --
$dpasTodos = @('luispedro', 'patriciacosta', 'dianaloio', 'pedrodinis', 'inescaeiro', 'americoferreira', 'nunosousa')
Set-GroupMembers -GroupName 'SG_FS_DPAS_RW' -Members $dpasTodos
Set-GroupMembers -GroupName 'SG_FS_DPAS_RO' -Members @('SG_FS_DPAS_RW', 'ricardosousa', 'claudiasantos', 'auditor')

# -- Ambiente --
Set-GroupMembers -GroupName 'SG_FS_AMBIENTE_RW' -Members @('patriciacosta', 'dianaloio')
Set-GroupMembers -GroupName 'SG_FS_AMBIENTE_RO' -Members @('SG_FS_AMBIENTE_RW', 'luispedro', 'ricardosousa')

# -- Projetos --
Set-GroupMembers -GroupName 'SG_FS_PROJ_RW' -Members @('pedrodinis', 'inescaeiro')
Set-GroupMembers -GroupName 'SG_FS_PROJ_RO' -Members @('SG_FS_PROJ_RW', 'luispedro', 'ricardosousa')

# -- Operacao --
Set-GroupMembers -GroupName 'SG_FS_OPERACAO_RW' -Members @('americoferreira', 'pedrodinis')
Set-GroupMembers -GroupName 'SG_FS_OPERACAO_RO' -Members @('SG_FS_OPERACAO_RW', 'luispedro', 'ricardosousa')

# -- Licenciamento --
Set-GroupMembers -GroupName 'SG_FS_LICENCIAMENTO_RW' -Members @('nunosousa')
Set-GroupMembers -GroupName 'SG_FS_LICENCIAMENTO_RO' -Members @('SG_FS_LICENCIAMENTO_RW', 'luispedro', 'ricardosousa')

# -- TI --
Set-GroupMembers -GroupName 'SG_FS_TI_RW' -Members @('rui.ramos', 'guilhermefigueiredo')

Write-Host ""
Write-Host "Log em: $logFile" -ForegroundColor Cyan
