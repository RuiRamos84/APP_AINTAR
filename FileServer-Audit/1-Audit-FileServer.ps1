<#
.SYNOPSIS
    Auditoria do FileServer -- partilhas SMB, permissoes de partilha e ACLs NTFS.
.DESCRIPTION
    Executar LOCALMENTE no fileserver, como Administrador.
    Apenas LEITURA -- nao altera nada.
    Gera CSVs na pasta .\Reports\ :
      - Shares.csv            : partilhas SMB e respetivas permissoes de partilha
      - NTFS-ACLs.csv         : ACLs NTFS ate a profundidade definida
      - NTFS-Problemas.csv    : red flags (utilizadores diretos nas ACLs, heranca quebrada,
                                Everyone/Authenticated Users com escrita, ACEs orfas)
.PARAMETER Depth
    Profundidade de pastas a auditar a partir da raiz de cada partilha (default: 3)
.EXAMPLE
    .\1-Audit-FileServer.ps1 -Depth 3
#>


[CmdletBinding()]
param(
    [int]$Depth = 3
)

$ErrorActionPreference = 'Continue'
$ReportDir = Join-Path $PSScriptRoot 'Reports'
New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'

Write-Host "=== Auditoria FileServer -- $env:COMPUTERNAME -- $stamp ===" -ForegroundColor Cyan

# ---------------------------------------------------------------
# 1. Partilhas SMB + permissoes de partilha
# ---------------------------------------------------------------
Write-Host "[1/3] A inventariar partilhas SMB..." -ForegroundColor Yellow

$systemShares = @('ADMIN$', 'IPC$', 'print$')
$shares = Get-SmbShare | Where-Object {
    $_.Name -notin $systemShares -and $_.Name -notmatch '^[A-Z]\$$'
}

$shareReport = foreach ($s in $shares) {
    $perms = Get-SmbShareAccess -Name $s.Name
    foreach ($p in $perms) {
        [PSCustomObject]@{
            Partilha     = $s.Name
            Caminho      = $s.Path
            Descricao    = $s.Description
            Conta        = $p.AccountName
            Acesso       = $p.AccessRight
            Tipo         = $p.AccessControlType
        }
    }
}
$shareReport | Export-Csv -Path (Join-Path $ReportDir "Shares_$stamp.csv") -NoTypeInformation -Encoding UTF8
Write-Host "    -> $($shares.Count) partilhas encontradas" -ForegroundColor Green

# ---------------------------------------------------------------
# 2. ACLs NTFS (ate $Depth niveis a partir da raiz de cada partilha)
# ---------------------------------------------------------------
Write-Host "[2/3] A recolher ACLs NTFS (profundidade $Depth)..." -ForegroundColor Yellow

function Get-FoldersToDepth {
    param([string]$Root, [int]$MaxDepth)
    $result = [System.Collections.Generic.List[string]]::new()
    $result.Add($Root)
    function Recurse([string]$Path, [int]$Level) {
        if ($Level -ge $MaxDepth) { return }
        Get-ChildItem -LiteralPath $Path -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $result.Add($_.FullName)
            Recurse $_.FullName ($Level + 1)
        }
    }
    Recurse $Root 0
    return $result
}

$aclRows      = [System.Collections.Generic.List[object]]::new()
$problemRows  = [System.Collections.Generic.List[object]]::new()

# Contas built-in aceitaveis nas ACLs (tudo o resto que nao seja grupo de dominio e flag)
$builtinOk = @(
    'NT AUTHORITY\SYSTEM', 'BUILTIN\Administrators', 'CREATOR OWNER',
    'NT AUTHORITY\Authenticated Users', 'BUILTIN\Users', 'Everyone'
)
$writeRights = 'Write|Modify|FullControl'

foreach ($s in $shares) {
    if (-not (Test-Path -LiteralPath $s.Path)) { continue }
    $folders = Get-FoldersToDepth -Root $s.Path -MaxDepth $Depth

    foreach ($f in $folders) {
        try {
            $acl = Get-Acl -LiteralPath $f
        } catch {
            $problemRows.Add([PSCustomObject]@{
                Pasta    = $f
                Problema = 'SEM_ACESSO'
                Detalhe  = "Nao foi possivel ler a ACL: $($_.Exception.Message)"
            })
            continue
        }

        $inheritanceBroken = $acl.AreAccessRulesProtected

        foreach ($ace in $acl.Access) {
            $id = $ace.IdentityReference.Value

            $aclRows.Add([PSCustomObject]@{
                Pasta            = $f
                Conta            = $id
                Direitos         = $ace.FileSystemRights.ToString()
                Tipo             = $ace.AccessControlType.ToString()
                Herdada          = $ace.IsInherited
                HerancaQuebrada  = $inheritanceBroken
            })

            # --- Red flags ---
            if ($id -match '^S-1-5-21-') {
                $problemRows.Add([PSCustomObject]@{
                    Pasta    = $f
                    Problema = 'ACE_ORFA'
                    Detalhe  = "SID sem resolucao (conta apagada?): $id"
                })
            }
            elseif ($id -notin $builtinOk -and -not $ace.IsInherited) {
                # ACE direta nao herdada -- verificar se e utilizador (nao grupo)
                try {
                    $ntAccount = New-Object System.Security.Principal.NTAccount($id)
                    $sid = $ntAccount.Translate([System.Security.Principal.SecurityIdentifier])
                    $obj = ([ADSI]"LDAP://<SID=$($sid.Value)>")
                    if ($obj.SchemaClassName -eq 'user') {
                        $problemRows.Add([PSCustomObject]@{
                            Pasta    = $f
                            Problema = 'UTILIZADOR_DIRETO'
                            Detalhe  = "Utilizador na ACL em vez de grupo: $id ($($ace.FileSystemRights))"
                        })
                    }
                } catch {
                    $problemRows.Add([PSCustomObject]@{
                        Pasta    = $f
                        Problema = 'VERIFICACAO_FALHOU'
                        Detalhe  = "Nao foi possivel validar tipo de $id : $($_.Exception.Message)"
                    })
                }
            }

            if (($id -eq 'Everyone' -or $id -eq 'NT AUTHORITY\Authenticated Users' -or $id -eq 'BUILTIN\Users') `
                -and $ace.FileSystemRights.ToString() -match $writeRights `
                -and $ace.AccessControlType -eq 'Allow') {
                $problemRows.Add([PSCustomObject]@{
                    Pasta    = $f
                    Problema = 'ACESSO_AMPLO_ESCRITA'
                    Detalhe  = "$id com $($ace.FileSystemRights)"
                })
            }
        }

        if ($inheritanceBroken) {
            $problemRows.Add([PSCustomObject]@{
                Pasta    = $f
                Problema = 'HERANCA_QUEBRADA'
                Detalhe  = 'Heranca de permissoes desativada nesta pasta'
            })
        }
    }
    Write-Host "    -> $($s.Name): $($folders.Count) pastas analisadas" -ForegroundColor Green
}

$aclRows     | Export-Csv -Path (Join-Path $ReportDir "NTFS-ACLs_$stamp.csv") -NoTypeInformation -Encoding UTF8
$problemRows | Export-Csv -Path (Join-Path $ReportDir "NTFS-Problemas_$stamp.csv") -NoTypeInformation -Encoding UTF8

# ---------------------------------------------------------------
# 3. Resumo no ecra
# ---------------------------------------------------------------
Write-Host "[3/3] Resumo:" -ForegroundColor Yellow
Write-Host ("    Partilhas:            {0}" -f $shares.Count)
Write-Host ("    Pastas com ACL lida:  {0}" -f @($aclRows.Pasta | Select-Object -Unique).Count)
Write-Host ("    Problemas detetados:  {0}" -f $problemRows.Count) -ForegroundColor $(if ($problemRows.Count) {'Red'} else {'Green'})

$problemRows | Group-Object Problema | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("      {0,-22} {1}" -f $_.Name, $_.Count)
}

Write-Host "`nRelatorios em: $ReportDir" -ForegroundColor Cyan
