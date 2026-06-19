<#
.SYNOPSIS
    Alteracoes AD resultantes da reorganizacao de servicos AINTAR 2026.
.DESCRIPTION
    Executar num DC ou maquina com RSAT, como Domain Admin.
    - Remove tiagoferraz dos grupos e move para Desativados
    - Cria conta Helena Lages (Juridico)
    - Ajusta grupos de ricardosousa, luispedro, josemelo, pedropatricio
    Usar -WhatIf para simular.
.EXAMPLE
    .\17-AD-Reorganizacao.ps1 -WhatIf
    .\17-AD-Reorganizacao.ps1
#>

#Requires -Modules ActiveDirectory

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Continue'
Import-Module ActiveDirectory -ErrorAction Stop

$domainDN = (Get-ADDomain).DistinguishedName
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'

function Log($msg, $color = 'White') { Write-Host "$(Get-Date -Format 'HH:mm:ss') $msg" -ForegroundColor $color }

Log "=== Reorganizacao AD AINTAR -- $stamp ===" 'Cyan'

# ---------------------------------------------------------------
# 1. Tiago Ferraz -- ja desativado, limpar grupos e mover OU
# ---------------------------------------------------------------
Log ""
Log "[1/5] Tiago Ferraz -- remover grupos + mover para Desativados" 'Yellow'

$gruposTF = @('SG_FS_DAGF_R', 'SG_FS_DPAS_R', 'SG_FS_Geral_R', 'SG_FS_TEMP_RW', 'SG_RDP_Users')
foreach ($g in $gruposTF) {
    if ($PSCmdlet.ShouldProcess("tiagoferraz", "Remover do grupo $g")) {
        try {
            Remove-ADGroupMember -Identity $g -Members 'tiagoferraz' -Confirm:$false -ErrorAction Stop
            Log "    [OK] Removido de $g" 'Green'
        } catch { Log "    [SKIP] $g : $($_.Exception.Message)" 'DarkYellow' }
    }
}

$desativadosOU = "OU=Desativados,OU=Utilizadores,$domainDN"
$tfDN = (Get-ADUser 'tiagoferraz').DistinguishedName
if ($PSCmdlet.ShouldProcess($tfDN, "Mover para $desativadosOU")) {
    try {
        Move-ADObject -Identity $tfDN -TargetPath $desativadosOU -ErrorAction Stop
        Log "    [OK] Movido para OU=Desativados" 'Green'
    } catch { Log "    [ERRO] Mover tiagoferraz: $($_.Exception.Message)" 'Red' }
}

# ---------------------------------------------------------------
# 2. Criar conta Helena Lages (Juridico)
# ---------------------------------------------------------------
Log ""
Log "[2/5] Helena Lages -- criar conta (Juridico)" 'Yellow'

$helenaExists = Get-ADUser -Filter "SamAccountName -eq 'helenal'" -ErrorAction SilentlyContinue
if ($helenaExists) {
    Log "    [SKIP] Conta 'helenal' ja existe: $($helenaExists.DistinguishedName)" 'DarkYellow'
} else {
    $helenaOU = "OU=Direcao,OU=Utilizadores,$domainDN"
    if ($PSCmdlet.ShouldProcess("helenal", "Criar conta Helena Lages em $helenaOU")) {
        try {
            $pw = ConvertTo-SecureString "Aintar2026!" -AsPlainText -Force
            New-ADUser `
                -SamAccountName    'helenal' `
                -UserPrincipalName "helenal@AINTAR.LOCAL" `
                -GivenName         'Helena' `
                -Surname           'Lages' `
                -Name              'Helena Lages' `
                -DisplayName       'Helena Lages' `
                -Path              $helenaOU `
                -AccountPassword   $pw `
                -Enabled           $true `
                -PasswordNeverExpires $false `
                -ChangePasswordAtLogon $true `
                -ErrorAction Stop
            Log "    [OK] Conta helenal criada em $helenaOU" 'Green'
            Log "    [INFO] Password temporaria: Aintar2026! (alterar no primeiro login)" 'Yellow'

            # Adicionar aos grupos
            foreach ($g in @('SG_FS_JURIDICO_RW', 'SG_FS_COMUM_RW', 'SG_FS_SCANNER_RW', 'SG_FS_ScannerGeral_RW')) {
                try {
                    Add-ADGroupMember -Identity $g -Members 'helenal' -ErrorAction Stop
                    Log "    [OK] Adicionada a $g" 'Green'
                } catch { Log "    [ERRO] Grupo $g : $($_.Exception.Message)" 'Red' }
            }
        } catch { Log "    [ERRO] Criar Helena Lages: $($_.Exception.Message)" 'Red' }
    }
}

# ---------------------------------------------------------------
# 3. Ricardo Sousa -- adicionar TI_RW (coordena equipa TI)
# ---------------------------------------------------------------
Log ""
Log "[3/5] Ricardo Sousa -- adicionar SG_FS_TI_RW" 'Yellow'

if ($PSCmdlet.ShouldProcess("ricardosousa", "Add SG_FS_TI_RW")) {
    try {
        Add-ADGroupMember -Identity 'SG_FS_TI_RW' -Members 'ricardosousa' -ErrorAction Stop
        Log "    [OK] Adicionado a SG_FS_TI_RW" 'Green'
    } catch { Log "    [ERRO] $($_.Exception.Message)" 'Red' }
}

# ---------------------------------------------------------------
# 4. Luis Pedro -- promover para RW em Ambiente e Projetos
# ---------------------------------------------------------------
Log ""
Log "[4/5] Luis Pedro -- RW em Ambiente e Projetos (era so RO)" 'Yellow'

$lpAdd    = @('SG_FS_AMBIENTE_RW', 'SG_FS_PROJ_RW')
$lpRemove = @('SG_FS_AMBIENTE_R', 'SG_FS_AMBIENTE_RO', 'SG_FS_PROJ_R', 'SG_FS_PROJ_RO')

foreach ($g in $lpAdd) {
    if ($PSCmdlet.ShouldProcess("luispedro", "Add $g")) {
        try {
            Add-ADGroupMember -Identity $g -Members 'luispedro' -ErrorAction Stop
            Log "    [OK] Adicionado a $g" 'Green'
        } catch { Log "    [ERRO] $g : $($_.Exception.Message)" 'Red' }
    }
}
foreach ($g in $lpRemove) {
    if ($PSCmdlet.ShouldProcess("luispedro", "Remove $g")) {
        try {
            Remove-ADGroupMember -Identity $g -Members 'luispedro' -Confirm:$false -ErrorAction Stop
            Log "    [OK] Removido de $g" 'Green'
        } catch { Log "    [SKIP] $g : $($_.Exception.Message)" 'DarkYellow' }
    }
}

# ---------------------------------------------------------------
# 5. Jose Melo -- transicao DAGF/Frota -> DPAS/Fiscalizacao+Armazem
# ---------------------------------------------------------------
Log ""
Log "[5/5] Jose Melo -- transicao para DPAS/Fiscalizacao" 'Yellow'

$jmAdd    = @('SG_FS_DPAS_RW', 'SG_FS_LICENCIAMENTO_RW')
$jmRemove = @('SG_FS_DAGF_RW', 'SG_FS_DAGF_R', 'SG_FS_FROTA_RW')

foreach ($g in $jmAdd) {
    if ($PSCmdlet.ShouldProcess("josemelo", "Add $g")) {
        try {
            Add-ADGroupMember -Identity $g -Members 'josemelo' -ErrorAction Stop
            Log "    [OK] Adicionado a $g" 'Green'
        } catch { Log "    [ERRO] $g : $($_.Exception.Message)" 'Red' }
    }
}
foreach ($g in $jmRemove) {
    if ($PSCmdlet.ShouldProcess("josemelo", "Remove $g")) {
        try {
            Remove-ADGroupMember -Identity $g -Members 'josemelo' -Confirm:$false -ErrorAction Stop
            Log "    [OK] Removido de $g" 'Green'
        } catch { Log "    [SKIP] $g : $($_.Exception.Message)" 'DarkYellow' }
    }
}

# ---------------------------------------------------------------
# 6. Pedro Patricio (TOC externo) -- so contabilidade
# ---------------------------------------------------------------
Log ""
Log "[6/6] Pedro Patricio (TOC) -- ajustar para acesso contabilidade" 'Yellow'

$ppAdd    = @('SG_FS_CONTABILIDADE_RO')
$ppRemove = @('SG_FS_DIR_RO', 'SG_FS_DPAS_R', 'SG_FS_Geral_R')

foreach ($g in $ppAdd) {
    if ($PSCmdlet.ShouldProcess("pedropatricio", "Add $g")) {
        try {
            Add-ADGroupMember -Identity $g -Members 'pedropatricio' -ErrorAction Stop
            Log "    [OK] Adicionado a $g" 'Green'
        } catch { Log "    [ERRO] $g : $($_.Exception.Message)" 'Red' }
    }
}
foreach ($g in $ppRemove) {
    if ($PSCmdlet.ShouldProcess("pedropatricio", "Remove $g")) {
        try {
            Remove-ADGroupMember -Identity $g -Members 'pedropatricio' -Confirm:$false -ErrorAction Stop
            Log "    [OK] Removido de $g" 'Green'
        } catch { Log "    [SKIP] $g : $($_.Exception.Message)" 'DarkYellow' }
    }
}

Log ""
Log "=== Concluido ===" 'Cyan'
Log "NOTA: Utilizadores com sessao ativa precisam de logoff/logon para tokens Kerberos atualizarem." 'Yellow'
Log "NOTA: Verificar SG_FS_OPERACAO_RW no FileServer -- pode ter SID orfao se nome do grupo tiver acento." 'Yellow'
