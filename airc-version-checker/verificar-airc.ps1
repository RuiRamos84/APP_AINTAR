<#
.SYNOPSIS
    Verificador de versoes AIRC - compara aplicacoes instaladas com versoes publicadas em airc.pt
.DESCRIPTION
    Auto-descobre aplicacoes AIRC instaladas no registo Windows, consulta a API publica da AIRC
    em https://www.airc.pt/api/v1/tnt/public/website/conteudo/download e gera relatorio de
    actualizacoes disponiveis. Quando ha versao mais recente, mostra o link de download.
.PARAMETER CsvOnly
    Nao imprime tabela na consola, apenas escreve CSV de log.
.PARAMETER NoLog
    Nao escreve CSV de historico.
.PARAMETER ShowAll
    Mostra tambem aplicacoes nao-AIRC com Publisher AIRC vazio (modo diagnostico).
.PARAMETER Download
    Tier 1: descarrega os installers das versoes desactualizadas para a pasta
    de staging e gera o manifest INSTALAR.txt. Nao instala nada.
.PARAMETER Extract
    Tier 2: alem do download, extrai os .zip descarregados e localiza o
    installer (.exe/.msi) dentro de cada pacote. Implica -Download.
.PARAMETER Install
    Tier 3: executa os installers de forma silenciosa quando o tipo e
    reconhecido (MSI, Inno Setup, InstallShield, NSIS) e verifica a versao
    apos instalar. Implica -Download e -Extract. Nao instala se a aplicacao
    tiver processos em execucao.
.PARAMETER Unattended
    Modo tarefa agendada: grava transcript em logs\run-*.log e nunca abre UI
    (installers de tipo desconhecido sao ignorados em vez de bloquearem).
.PARAMETER StagingDir
    Pasta destino dos installers (default: updates-pendentes junto ao script).
.EXAMPLE
    .\verificar-airc.ps1
    Execucao normal: tabela na consola + log em CSV.
.EXAMPLE
    .\verificar-airc.ps1 -Download -Extract
    Verifica, descarrega e extrai os updates pendentes, sem instalar.
.EXAMPLE
    .\verificar-airc.ps1 -Install
    Ciclo completo: verifica, descarrega, extrai e instala silenciosamente.
    Correr numa consola elevada (Administrador).
.EXAMPLE
    .\configurar-tarefa-agendada.ps1
    Cria a tarefa agendada semanal (ver script proprio para opcoes).
.NOTES
    Compativel com Windows PowerShell 5.1 e PowerShell 7+.
    API publica AIRC, sem autenticacao necessaria.
#>

[CmdletBinding()]
param(
    [switch]$CsvOnly,
    [switch]$NoLog,
    [switch]$ShowAll,
    [switch]$Diagnose,
    [switch]$Download,
    [switch]$Extract,
    [switch]$Install,
    [switch]$Unattended,
    [string]$StagingDir
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Cadeia de implicacoes: instalar precisa de extrair, extrair precisa de descarregar
if ($Install) { $Extract  = $true }
if ($Extract) { $Download = $true }

$LogDir = Join-Path $PSScriptRoot 'logs'

# Em modo nao-assistido (tarefa agendada) gravar transcript completo da execucao
if ($Unattended) {
    if (-not (Test-Path $LogDir)) { New-Item -Path $LogDir -ItemType Directory -Force | Out-Null }
    $transcriptPath = Join-Path $LogDir ("run-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
    try { Start-Transcript -Path $transcriptPath | Out-Null } catch {}
    # Retencao: manter apenas os 30 transcripts mais recentes
    Get-ChildItem $LogDir -Filter 'run-*.log' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -Skip 30 |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

# PS 5.1 usa TLS 1.0 por defeito; airc.pt exige TLS 1.2+
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
} catch {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

# --- Configuracao ---
$ApiBase        = 'https://www.airc.pt/api/v1/tnt/public/website/conteudo/download'
$ApiDropdown    = 'https://www.airc.pt/api/v1/tnt/public/website/produto/dropdown'
$LogFile        = Join-Path $PSScriptRoot 'relatorio-airc.csv'

# Codigos AIRC conhecidos (extraidos do catalogo da API em 2026-05)
$KnownCodes = @(
    'ADM','AIRCSign','GAS','GCP','GES','HST','MyDoc WIN','OAD','SAD','SBA',
    'SCE','SEF','SFP','SGA','SGC','SGD','SGF','SGP','SGR','SMT',
    'SNC-AP','SNP','SNT','SPO','STA','TAX','TEC'
)

# Aliases para casos em que o DisplayName instalado nao bate exactamente
# com a designacao do catalogo da API. Chave = padrao (normalizado, ja sem
# acentos/maiusculas/pontuacao); valor = codigo do produto AIRC.
# Adiciona aqui novas excepcoes quando aparecerem.
$KnownAliases = @{
    'tesourariaparasncap' = 'SNT'  # "AIRC - Sistema de Tesouraria para SNCAP" -> SNT
}

# --- Funcoes utilitarias ---

function Get-AircJson {
    # Helper para chamar a API AIRC forcando UTF-8 na decodificacao.
    # PS 5.1 default: Invoke-RestMethod usa Latin-1 quando o Content-Type nao
    # especifica charset (caso da API AIRC), corrompendo caracteres acentuados.
    # Le bytes crus e decodifica como UTF-8 explicitamente.
    param(
        [string]$Uri,
        [int]$TimeoutSec = 30
    )
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec
    $bytes = $null
    if ($response.RawContentStream -and $response.RawContentStream.Length -gt 0) {
        $bytes = $response.RawContentStream.ToArray()
    } elseif ($response.Content -is [byte[]]) {
        $bytes = [byte[]]$response.Content
    } else {
        # PS 7+: Content ja eh string decodificada correctamente
        return ($response.Content | ConvertFrom-Json)
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    return ($text | ConvertFrom-Json)
}

function Get-ExeMajor {
    # Extrai a "major version" (primeiro numero) de um FileInfo de .exe.
    # Tenta FileVersion primeiro, depois ProductVersion. Normaliza virgulas.
    param($exe)
    if (-not $exe) { return $null }
    $vi = $exe.VersionInfo
    $candidates = @($vi.FileVersion, $vi.ProductVersion) | Where-Object { $_ }
    foreach ($v in $candidates) {
        $norm = $v -replace ',','.'
        if ($norm -match '^\s*(\d+)') { return [int]$matches[1] }
    }
    return $null
}

function Save-AircInstaller {
    # Descarrega um installer de uma URL de partilha do SharePoint AIRC.
    # Estrategia: anexar &download=1 (ou ?download=1) para forcar download
    # directo em vez da pagina de visualizacao. Le o Content-Disposition para
    # preservar o nome original do ficheiro.
    param(
        [string]$Url,
        [string]$Destination,
        [string]$ProductCode,
        [string]$Version
    )
    if (-not (Test-Path $Destination)) {
        New-Item -Path $Destination -ItemType Directory -Force | Out-Null
    }
    $separator   = if ($Url.Contains('?')) { '&' } else { '?' }
    $downloadUrl = "$Url${separator}download=1"
    $safeCode    = ($ProductCode -replace '[^A-Za-z0-9_\-]', '_')
    if (-not $safeCode) { $safeCode = 'AIRC' }
    # Temp dentro da propria pasta de destino: o rename final preserva o ACL
    # herdado. (Um Move-Item vindo de %TEMP% arrasta o ACL restritivo de
    # C:\Windows\Temp quando a tarefa corre como SYSTEM, deixando o ficheiro
    # ilegivel para os administradores que vao instalar.)
    $tempFile    = Join-Path $Destination "airc-tmp-$safeCode-$Version-$([guid]::NewGuid().ToString('N').Substring(0,8)).part"

    try {
        $response = Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -PassThru -UseBasicParsing -TimeoutSec 600
        # Extrair filename do Content-Disposition (RFC 6266)
        $filename = $null
        $cd = $response.Headers['Content-Disposition']
        if ($cd) {
            if ($cd -is [array]) { $cd = $cd[0] }
            # Tentar filename*=UTF-8''xxx primeiro (RFC 5987)
            if ($cd -match "filename\*\s*=\s*UTF-8''([^;]+)") {
                $filename = [System.Uri]::UnescapeDataString($matches[1])
            } elseif ($cd -match 'filename\s*=\s*"([^"]+)"') {
                $filename = $matches[1]
            } elseif ($cd -match 'filename\s*=\s*([^;]+)') {
                $filename = $matches[1].Trim()
            }
        }
        if (-not $filename) {
            $filename = "${safeCode}_${Version}.bin"
        }
        # Sanitizar caracteres de path
        $filename = $filename -replace '[\\/:*?"<>|]', '_'
        $finalPath = Join-Path $Destination $filename
        if (Test-Path $finalPath) {
            Remove-Item $finalPath -Force
        }
        Move-Item -Path $tempFile -Destination $finalPath
        return [pscustomobject]@{
            Success  = $true
            Path     = $finalPath
            Filename = $filename
            Size     = (Get-Item $finalPath).Length
        }
    } catch {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
        return [pscustomobject]@{
            Success  = $false
            Error    = $_.Exception.Message
        }
    }
}

function Get-InstallerKind {
    # Identifica a tecnologia do installer para escolher os switches silenciosos
    # correctos. Primeiro tenta o VersionInfo (barato); depois procura assinaturas
    # de texto no inicio e fim do binario (Inno Setup guarda a sua no final).
    param([string]$Path)
    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    if ($ext -eq '.msi') { return 'MSI' }
    if ($ext -ne '.exe') { return 'Desconhecido' }

    try {
        $vi = (Get-Item $Path).VersionInfo
        $meta = "$($vi.CompanyName) $($vi.FileDescription) $($vi.ProductName) $($vi.Comments)"
        if ($meta -match '(?i)inno setup')    { return 'InnoSetup' }
        if ($meta -match '(?i)installshield') { return 'InstallShield' }
        if ($meta -match '(?i)nullsoft|nsis') { return 'NSIS' }
    } catch {}

    try {
        $fs = [System.IO.File]::OpenRead($Path)
        try {
            $headLen = [int][Math]::Min($fs.Length, 2MB)
            $head = New-Object byte[] $headLen
            [void]$fs.Read($head, 0, $headLen)
            $tailLen = [int][Math]::Min($fs.Length, 512KB)
            [void]$fs.Seek(-$tailLen, [System.IO.SeekOrigin]::End)
            $tail = New-Object byte[] $tailLen
            [void]$fs.Read($tail, 0, $tailLen)
        } finally { $fs.Close() }
        foreach ($enc in @([System.Text.Encoding]::ASCII, [System.Text.Encoding]::Unicode)) {
            $txt = $enc.GetString($head) + ' ' + $enc.GetString($tail)
            if ($txt -match 'Inno Setup')    { return 'InnoSetup' }
            if ($txt -match 'InstallShield') { return 'InstallShield' }
            if ($txt -match 'Nullsoft')      { return 'NSIS' }
        }
    } catch {}
    return 'Desconhecido'
}

function Expand-AircPackage {
    # Prepara o pacote descarregado para instalacao:
    #   .exe/.msi -> devolve o proprio ficheiro
    #   .zip      -> extrai para subpasta com o mesmo nome e localiza o installer
    # Ficheiros .bin (sem Content-Disposition) sao testados pelo magic number PK.
    param([string]$Path)
    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()

    if ($ext -notin @('.zip', '.exe', '.msi')) {
        try {
            $fs = [System.IO.File]::OpenRead($Path)
            try {
                $magic = New-Object byte[] 4
                [void]$fs.Read($magic, 0, 4)
            } finally { $fs.Close() }
            if ($magic[0] -eq 0x50 -and $magic[1] -eq 0x4B) { $ext = '.zip' }
        } catch {}
    }

    if ($ext -in @('.exe', '.msi')) {
        return [pscustomobject]@{ Success = $true; Installer = $Path; Extracted = $false; ExtractDir = $null }
    }
    if ($ext -ne '.zip') {
        return [pscustomobject]@{ Success = $false; Error = "Formato de pacote nao suportado: '$ext'" }
    }

    $extractDir = Join-Path (Split-Path $Path -Parent) ([System.IO.Path]::GetFileNameWithoutExtension($Path))
    $errCount = 0
    $firstErr = $null
    try {
        if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
        New-Item -Path $extractDir -ItemType Directory -Force | Out-Null
        # ZipFile em vez de Expand-Archive (que recusa extensoes != .zip), e
        # extraccao manual entrada-a-entrada em vez de ExtractToDirectory: os
        # zips AIRC/SharePoint trazem entradas de directoria COM dados ("Zip
        # entry name ends in directory separator character but contains data"),
        # que o ExtractToDirectory rejeita por inteiro, deixando o pacote a meio.
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $rootFull = (Get-Item $extractDir).FullName.TrimEnd('\') + '\'
        $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
        try {
            foreach ($entry in $zip.Entries) {
                $rel = $entry.FullName -replace '/', '\'
                $isDirEntry = $rel.EndsWith('\')
                # Entrada marcada como directoria mas com dados -> tratar como ficheiro
                if ($isDirEntry -and $entry.Length -gt 0) {
                    $rel = $rel.TrimEnd('\')
                    $isDirEntry = $false
                }
                if ([string]::IsNullOrWhiteSpace($rel)) { continue }

                # Proteccao zip-slip: o alvo tem de ficar dentro de $extractDir
                $targetFull = [System.IO.Path]::GetFullPath((Join-Path $extractDir $rel))
                if (-not $targetFull.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) { continue }

                try {
                    if ($isDirEntry) {
                        if (-not (Test-Path $targetFull)) {
                            New-Item -Path $targetFull -ItemType Directory -Force | Out-Null
                        }
                        continue
                    }
                    $parent = Split-Path $targetFull -Parent
                    if (-not (Test-Path $parent)) {
                        New-Item -Path $parent -ItemType Directory -Force | Out-Null
                    }
                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $targetFull, $true)
                } catch {
                    $errCount++
                    if (-not $firstErr) { $firstErr = "$($entry.FullName): $($_.Exception.Message)" }
                }
            }
        } finally {
            $zip.Dispose()
        }
    } catch {
        return [pscustomobject]@{ Success = $false; Error = "Falha a extrair: $($_.Exception.Message)" }
    }
    $warning = if ($errCount -gt 0) {
        "{0} entrada(s) do zip falharam a extrair (primeira: {1})" -f $errCount, $firstErr
    } else { $null }

    # Localizar o installer dentro do zip: setup*/install*.exe > .msi > maior .exe
    $files = @(Get-ChildItem -Path $extractDir -Recurse -File -ErrorAction SilentlyContinue)
    $installer = $files | Where-Object { $_.Extension -eq '.exe' -and $_.BaseName -match '(?i)^(setup|install)' } |
        Sort-Object Length -Descending | Select-Object -First 1
    if (-not $installer) {
        $installer = $files | Where-Object { $_.Extension -eq '.msi' } |
            Sort-Object Length -Descending | Select-Object -First 1
    }
    if (-not $installer) {
        $installer = $files | Where-Object { $_.Extension -eq '.exe' } |
            Sort-Object Length -Descending | Select-Object -First 1
    }
    if (-not $installer) {
        return [pscustomobject]@{ Success = $false; Error = 'Nenhum .exe/.msi encontrado dentro do pacote'; ExtractDir = $extractDir; Warning = $warning }
    }
    return [pscustomobject]@{ Success = $true; Installer = $installer.FullName; Extracted = $true; ExtractDir = $extractDir; Warning = $warning }
}

function Test-AircAppInUse {
    # Devolve os processos em execucao a partir da pasta da aplicacao.
    # Instalar por cima de binarios em uso falha ou deixa a app inconsistente.
    param([string]$InstallPath)
    if ([string]::IsNullOrWhiteSpace($InstallPath)) { return @() }
    if (-not (Test-Path $InstallPath)) { return @() }
    $norm = $InstallPath.TrimEnd('\') + '\'
    return @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -and $_.Path.StartsWith($norm, [System.StringComparison]::OrdinalIgnoreCase)
    })
}

function Invoke-AircInstaller {
    # Executa o installer com os switches silenciosos do tipo detectado.
    # Tipos desconhecidos: em -Unattended sao ignorados (sem sessao grafica,
    # um installer interactivo ficaria pendurado); em modo interactivo abrem UI.
    # Exit codes aceites: 0 (OK) e 3010 (OK, requer reboot).
    param(
        [string]$Installer,
        [string]$LogDir,
        [switch]$Unattended
    )
    $kind = Get-InstallerKind -Path $Installer
    if (-not (Test-Path $LogDir)) { New-Item -Path $LogDir -ItemType Directory -Force | Out-Null }
    $safeName = [System.IO.Path]::GetFileNameWithoutExtension($Installer) -replace '[^\w\-]', '_'
    $logBase  = Join-Path $LogDir ("install-{0}-{1}" -f $safeName, (Get-Date -Format 'yyyyMMdd-HHmmss'))

    $exe     = $Installer
    $argList = $null
    switch ($kind) {
        'MSI'           { $exe = 'msiexec.exe'; $argList = "/i `"$Installer`" /qn /norestart /l*v `"$logBase.msi.log`"" }
        'InnoSetup'     { $argList = "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /LOG=`"$logBase.inno.log`"" }
        'InstallShield' { $argList = '/s /v"/qn /norestart"' }  # variante MSI-based; legacy exigiria .iss gravado
        'NSIS'          { $argList = '/S' }
        default {
            if ($Unattended) {
                return [pscustomobject]@{
                    Success = $false; Kind = $kind; ExitCode = $null
                    Error   = 'Tipo de installer desconhecido - sem switches silenciosos seguros. Correr manualmente uma vez para identificar.'
                }
            }
            # Modo interactivo: abre a UI do installer e espera
        }
    }

    try {
        if ($argList) {
            $proc = Start-Process -FilePath $exe -ArgumentList $argList -Wait -PassThru
        } else {
            $proc = Start-Process -FilePath $exe -Wait -PassThru
        }
        $code = $proc.ExitCode
        $ok = ($code -eq 0 -or $code -eq 3010)
        return [pscustomobject]@{
            Success  = $ok
            Kind     = $kind
            ExitCode = $code
            Error    = if (-not $ok) { "Exit code $code" } else { $null }
        }
    } catch {
        return [pscustomobject]@{ Success = $false; Kind = $kind; ExitCode = $null; Error = $_.Exception.Message }
    }
}

function Get-NormalizedText {
    # Lowercase + remove diacriticos + so alfanumerico
    # Permite comparar "Sistema de Normalizacao" com "Sistema de Normalizacao"
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
    $decomposed = $Text.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $decomposed.ToCharArray()) {
        $cat = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
        if ($cat -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($ch)
        }
    }
    $clean = $sb.ToString().ToLowerInvariant()
    $clean = $clean -replace '[^a-z0-9]', ''
    return $clean
}

function Resolve-AircCode {
    # Tenta resolver o codigo de produto AIRC a partir do DisplayName,
    # usando 4 estrategias em cascata:
    #   1. Match por codigo conhecido como token isolado
    #   2. Match por designacao do catalogo da API (normalizado)
    #   3. Match por alias manual ($KnownAliases)
    #   4. Sem match
    param(
        [string]$DisplayName,
        [string[]]$Codes,
        [hashtable]$DesignationToCode,  # designacao normalizada -> codigo
        [hashtable]$Aliases = @{}
    )
    if ([string]::IsNullOrWhiteSpace($DisplayName)) { return $null }

    # Estrategia 1: codigo como token
    foreach ($code in $Codes) {
        $esc = [regex]::Escape($code)
        if ($DisplayName -match "(?i)(^|[^A-Za-z0-9])$esc([^A-Za-z0-9]|$)") {
            return $code
        }
    }

    $normalizedName = Get-NormalizedText $DisplayName
    if (-not $normalizedName) { return $null }

    # Estrategia 2: designacao do catalogo contida no DisplayName
    # Tentar match mais longo primeiro (evita "Sistema" colidir com varios produtos)
    $sortedDesigs = $DesignationToCode.Keys | Sort-Object -Property Length -Descending
    foreach ($normDesig in $sortedDesigs) {
        if (-not $normDesig) { continue }
        if ($normalizedName.Contains($normDesig)) {
            return $DesignationToCode[$normDesig]
        }
    }

    # Estrategia 3: alias manual
    $sortedAliases = $Aliases.Keys | Sort-Object -Property Length -Descending
    foreach ($pattern in $sortedAliases) {
        if (-not $pattern) { continue }
        if ($normalizedName.Contains($pattern)) {
            return $Aliases[$pattern]
        }
    }

    return $null
}

function Compare-AircVersion {
    param([string]$Installed, [string]$Available)
    if ([string]::IsNullOrWhiteSpace($Installed) -or [string]::IsNullOrWhiteSpace($Available)) {
        return $null
    }
    # Normalizar separadores: Windows PT devolve FileVersion com virgulas ("26,6,112,0").
    # Tratar virgula como ponto para comparar correctamente.
    $Installed = $Installed -replace ',','.'
    $Available = $Available -replace ',','.'
    $a = @($Installed -split '\.' | ForEach-Object {
        $n = ($_ -replace '\D','')
        if ($n) { [int]$n } else { 0 }
    })
    $b = @($Available -split '\.' | ForEach-Object {
        $n = ($_ -replace '\D','')
        if ($n) { [int]$n } else { 0 }
    })
    # Comparar segmento a segmento APENAS ate ao comprimento da versao do
    # catalogo da AIRC (Available). Segmentos extras na Installed (ex: build
    # 26.77.1112.0 vs catalogo 26.77) sao build numbers internos nao publicados
    # pela AIRC e nao devem fazer a versao parecer "mais recente".
    for ($i = 0; $i -lt $b.Count; $i++) {
        $ai = if ($i -lt $a.Count) { $a[$i] } else { 0 }
        $bi = $b[$i]
        if ($ai -lt $bi) { return -1 }
        if ($ai -gt $bi) { return  1 }
    }
    return 0
}

function Get-AircProductCatalog {
    # Endpoint /produto/dropdown - mapa autoritativo codigo -> designacao para
    # TODOS os produtos AIRC publicados. Mais fiavel que extrair designacoes
    # do feed de versoes (onde entradas historicas podem ter campos vazios).
    Write-Verbose 'A consultar catalogo de produtos AIRC...'
    $codeToDesignation = @{}
    try {
        $dropdown = Get-AircJson -Uri $ApiDropdown
    } catch {
        Write-Verbose "Falha no dropdown: $($_.Exception.Message). Vamos depender so do feed de versoes."
        return $codeToDesignation
    }
    foreach ($solucao in $dropdown) {
        if (-not $solucao.produtos) { continue }
        foreach ($p in $solucao.produtos) {
            $code = [string]$p.valorExtra
            $desig = [string]$p.label
            if ($code -and $desig -and -not $codeToDesignation.ContainsKey($code)) {
                $codeToDesignation[$code] = $desig
            }
        }
    }
    return $codeToDesignation
}

function Get-AircFromApi {
    Write-Verbose 'A consultar API AIRC...'
    $catalog = @{}
    $page    = 0
    $totalPages = 1
    $maxPages   = 50
    do {
        $url = "$ApiBase`?tipoDownload=VERSAO_PRODUTO&page=$page&size=100"
        try {
            $r = Get-AircJson -Uri $url
        } catch {
            throw "Falha ao contactar API AIRC ($url): $($_.Exception.Message)"
        }
        $totalPages = [int]$r.totalPages
        foreach ($item in $r.content) {
            if (-not $item.produtoCodigo) { continue }
            $code = $item.produtoCodigo
            $itemDate = if ($item.data) {
                try { [datetime]$item.data } catch { [datetime]::MinValue }
            } else { [datetime]::MinValue }
            $existing = $catalog[$code]
            if (-not $existing -or $itemDate -gt $existing.Data) {
                $catalog[$code] = [pscustomobject]@{
                    Codigo     = $code
                    Designacao = $item.produtoDesignacao
                    Versao     = $item.versao
                    Data       = $itemDate
                    Titulo     = $item.titulo
                    Link       = $item.link
                }
            }
        }
        $page++
    } while ($page -lt $totalPages -and $page -lt $maxPages)
    return $catalog
}

function Get-AircInstalled {
    param(
        [hashtable]$Catalog        = @{},  # feed de versoes (codigo -> objecto com versao/data/etc)
        [hashtable]$ProductCatalog = @{}   # dropdown (codigo -> designacao, autoritativo)
    )
    Write-Verbose 'A varrer registo Windows...'
    $results = @()
    $seen    = @{}

    # Construir mapa designacao-normalizada -> codigo
    # Fonte primaria: ProductCatalog (dropdown) - sempre tem designacao
    # Fonte fallback: Catalog (feed de versoes) - pode faltar designacao em entradas historicas
    $designationToCode = @{}
    foreach ($code in $ProductCatalog.Keys) {
        $desig = $ProductCatalog[$code]
        if ($desig) {
            $norm = Get-NormalizedText $desig
            if ($norm -and -not $designationToCode.ContainsKey($norm)) {
                $designationToCode[$norm] = $code
            }
        }
    }
    foreach ($code in $Catalog.Keys) {
        $entry = $Catalog[$code]
        if ($entry -and $entry.Designacao) {
            $norm = Get-NormalizedText $entry.Designacao
            if ($norm -and -not $designationToCode.ContainsKey($norm)) {
                $designationToCode[$norm] = $code
            }
        }
    }

    $uninstallPaths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    )

    foreach ($path in $uninstallPaths) {
        if (-not (Test-Path $path)) { continue }
        Get-ChildItem $path -ErrorAction SilentlyContinue | ForEach-Object {
            $props = $null
            try { $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue } catch {}
            if (-not $props) { return }
            if ([string]::IsNullOrWhiteSpace($props.DisplayName)) { return }

            $publisher  = [string]$props.Publisher
            $name       = [string]$props.DisplayName
            $isAirc     = ($publisher -match 'AIRC') -or ($name -match 'AIRC')

            $detected = Resolve-AircCode -DisplayName $name -Codes $KnownCodes -DesignationToCode $designationToCode -Aliases $KnownAliases
            if ($detected) { $isAirc = $true }

            if (-not $isAirc -and -not $ShowAll) { return }

            $key = "$name|$($props.DisplayVersion)"
            if ($seen.ContainsKey($key)) { return }
            $seen[$key] = $true

            $results += [pscustomobject]@{
                Codigo      = $detected
                DisplayName = $name
                Versao      = [string]$props.DisplayVersion
                Publisher   = $publisher
                InstallPath = [string]$props.InstallLocation
                Source      = 'Uninstall'
            }
        }
    }

    # Varredura adicional em HKLM\SOFTWARE\AIRC* (apps antigas)
    @('HKLM:\SOFTWARE','HKLM:\SOFTWARE\Wow6432Node') | ForEach-Object {
        $root = $_
        if (-not (Test-Path $root)) { return }
        Get-ChildItem $root -ErrorAction SilentlyContinue |
            Where-Object { $_.PSChildName -match '(?i)airc' } |
            ForEach-Object {
                $childPath = $_.PSPath
                $props = Get-ItemProperty $childPath -ErrorAction SilentlyContinue
                if (-not $props) { return }
                $version = $props.Version
                if (-not $version) { $version = $props.Versao }
                if (-not $version) { $version = $props.DisplayVersion }
                if (-not $version) { return }

                $name = $_.PSChildName
                $detected = Resolve-AircCode -DisplayName $name -Codes $KnownCodes -DesignationToCode $designationToCode -Aliases $KnownAliases
                $key = "REG|$name|$version"
                if ($seen.ContainsKey($key)) { return }
                $seen[$key] = $true

                $results += [pscustomobject]@{
                    Codigo      = $detected
                    DisplayName = $name
                    Versao      = [string]$version
                    Publisher   = 'AIRC (registo)'
                    InstallPath = ''
                    Source      = 'Registry'
                }
            }
    }

    # --- Enriquecer com FileVersion do .exe ---
    # O installer AIRC nem sempre actualiza DisplayVersion no registo Uninstall
    # quando faz updates (so na primeira instalacao). Por isso lemos a FileVersion
    # do .exe principal, que e o reflexo real do binario instalado.
    foreach ($r in $results) {
        $r | Add-Member -NotePropertyName VersaoFicheiro -NotePropertyValue $null -Force
        $r | Add-Member -NotePropertyName ExePrincipal  -NotePropertyValue $null -Force

        if ([string]::IsNullOrWhiteSpace($r.InstallPath)) { continue }
        if (-not (Test-Path $r.InstallPath)) { continue }

        try {
            $exes = @(Get-ChildItem -Path $r.InstallPath -Filter '*.exe' -ErrorAction SilentlyContinue)
            if ($exes.Count -eq 0) { continue }

            # Filtrar candidatos: excluir uninstallers, setups, prereqs e utilitarios obvios
            $candidates = @($exes | Where-Object {
                $_.Name -notmatch '(?i)(unins\d|uninst|setup|patch|install|update|airc.*prereq|certs|dotnetfx|vcredist)'
            })
            if ($candidates.Count -eq 0) { $candidates = $exes }

            # Major version do registo (sanity check para descartar .exes errados como
            # utilitarios v2.x num produto v26.x)
            $registroMajor = 0
            if ($r.Versao -and ($r.Versao -replace ',','.') -match '^(\d+)') {
                $registroMajor = [int]$matches[1]
            }

            # Estrategias de seleccao do .exe principal (em ordem):
            $mainExe = $null
            $codeBase     = if ($r.Codigo) { ($r.Codigo -replace '\s','').ToLower() } else { '' }
            $codeAlphaNum = if ($r.Codigo) { ($r.Codigo -replace '[^A-Za-z0-9]','').ToLower() } else { '' }

            # 1. BaseName igual ao codigo (com ou sem caracteres especiais)
            #    ex: SNC-AP -> tenta "snc-ap" e "sncap"
            if ($codeBase -or $codeAlphaNum) {
                $mainExe = $candidates | Where-Object {
                    $b = $_.BaseName.ToLower()
                    ($codeBase -and $b -eq $codeBase) -or
                    ($codeAlphaNum -and $b -eq $codeAlphaNum)
                } | Select-Object -First 1
            }

            # 2. BaseName contem o codigo alfanumerico (ex: SGPapp.exe contem "sgp")
            if (-not $mainExe -and $codeAlphaNum -and $codeAlphaNum.Length -ge 3) {
                $mainExe = $candidates | Where-Object {
                    $_.BaseName.ToLower().Contains($codeAlphaNum)
                } | Sort-Object Length -Descending | Select-Object -First 1
            }

            # 3. Sanity check: .exe cujo major bate com o do registo
            if (-not $mainExe -and $registroMajor -gt 0) {
                $mainExe = $candidates | Where-Object {
                    $m = Get-ExeMajor $_
                    $m -eq $registroMajor
                } | Sort-Object Length -Descending | Select-Object -First 1
            }

            # 4. Fallback: maior .exe (mas so se passar o sanity check, caso exista)
            if (-not $mainExe) {
                if ($registroMajor -gt 0) {
                    $sane = $candidates | Where-Object {
                        $m = Get-ExeMajor $_
                        # Aceitar majors proximos (registo pode ter major desfasado em legacy apps)
                        $m -and ([Math]::Abs($m - $registroMajor) -le 1 -or $m -ge $registroMajor)
                    } | Sort-Object Length -Descending | Select-Object -First 1
                    if ($sane) { $mainExe = $sane }
                }
                if (-not $mainExe) {
                    $mainExe = $candidates | Sort-Object Length -Descending | Select-Object -First 1
                }
            }
            if (-not $mainExe) { continue }

            # Ler FileVersion (preferida) ou ProductVersion como fallback
            $vi = $mainExe.VersionInfo
            $fv = $null
            foreach ($v in @($vi.FileVersion, $vi.ProductVersion)) {
                if ($v) {
                    $norm = ($v.Trim() -replace ',','.')
                    if ($norm -and $norm -notmatch '^0\.0\.0' -and $norm -ne '1.0.0.0') {
                        $fv = $norm
                        break
                    }
                }
            }
            if ($fv) {
                $r.VersaoFicheiro = $fv
                $r.ExePrincipal   = $mainExe.Name
            }
        } catch {
            # Silencia falhas de leitura (ficheiro lockado, sem permissoes, etc.)
        }
    }

    return $results
}

# --- Execucao principal ---

Write-Host ''
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ' Verificador de Versoes AIRC' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Write-Host ''

try {
    $productCatalog = Get-AircProductCatalog
    $catalog        = Get-AircFromApi
    $installed      = @(Get-AircInstalled -Catalog $catalog -ProductCatalog $productCatalog)
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# --- Diagnostico ---
if ($Diagnose) {
    Write-Host ''
    Write-Host '=== DIAGNOSTICO ===' -ForegroundColor Magenta
    Write-Host ''
    Write-Host 'ProductCatalog (dropdown):' -ForegroundColor Magenta
    $productCatalog.GetEnumerator() | Sort-Object Key | ForEach-Object {
        Write-Host ("  [{0}] {1}" -f $_.Key, $_.Value) -ForegroundColor Gray
    }
    Write-Host ''
    Write-Host 'Designation map (normalizado -> codigo):' -ForegroundColor Magenta
    # Reconstruir o mesmo mapa para diagnostico
    $diagMap = @{}
    foreach ($code in $productCatalog.Keys) {
        $desig = $productCatalog[$code]
        if ($desig) {
            $norm = Get-NormalizedText $desig
            if ($norm -and -not $diagMap.ContainsKey($norm)) {
                $diagMap[$norm] = $code
            }
        }
    }
    $diagMap.GetEnumerator() | Sort-Object @{Expression={$_.Key.Length};Descending=$true} | ForEach-Object {
        Write-Host ("  {0} -> {1}" -f $_.Value, $_.Key) -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host 'Tentativas de match por aplicacao instalada:' -ForegroundColor Magenta
    foreach ($app in $installed) {
        $normName = Get-NormalizedText $app.DisplayName
        Write-Host ''
        Write-Host ("  Instalada: {0}" -f $app.DisplayName) -ForegroundColor White
        Write-Host ("  Normalizado: {0}" -f $normName) -ForegroundColor DarkGray
        Write-Host ("  Codigo resolvido: {0}" -f ($app.Codigo | ForEach-Object { if ($_) { $_ } else { '(nenhum)' } })) -ForegroundColor DarkGray
        # Mostrar quais designacoes do mapa estao contidas no nome
        $hits = @()
        foreach ($k in $diagMap.Keys) {
            if ($k -and $normName.Contains($k)) {
                $hits += ("{0} (-> {1})" -f $k, $diagMap[$k])
            }
        }
        if ($hits.Count -eq 0) {
            Write-Host '  Hits no mapa: NENHUM' -ForegroundColor Yellow
        } else {
            Write-Host '  Hits no mapa:' -ForegroundColor Green
            $hits | ForEach-Object { Write-Host ("    - {0}" -f $_) -ForegroundColor Green }
        }
    }
    Write-Host ''
    Write-Host '=== FIM DIAGNOSTICO ===' -ForegroundColor Magenta
    Write-Host ''
    exit 0
}

Write-Host ("Catalogo produtos : {0} produtos no dropdown AIRC" -f $productCatalog.Count) -ForegroundColor DarkGray
Write-Host ("Feed de versoes   : {0} produtos com versao publicada" -f $catalog.Count) -ForegroundColor DarkGray
Write-Host ("Detectadas        : {0} aplicacoes AIRC instaladas" -f $installed.Count) -ForegroundColor DarkGray
Write-Host ''

if ($installed.Count -eq 0) {
    Write-Host 'Nenhuma aplicacao AIRC detectada no registo.' -ForegroundColor Yellow
    Write-Host 'Sugestoes:' -ForegroundColor Yellow
    Write-Host '  - Confirma que executas o script com permissoes para ler HKLM.' -ForegroundColor Yellow
    Write-Host '  - Corre com -ShowAll para listar todas as entradas e ajudar a diagnosticar.' -ForegroundColor Yellow
    Write-Host '  - Se os produtos nao registam no Uninstall, abre um issue (precisamos de adaptar a deteccao).' -ForegroundColor Yellow
    exit 0
}

# Construir relatorio
$report = foreach ($app in $installed) {
    $api = $null
    if ($app.Codigo -and $catalog.ContainsKey($app.Codigo)) {
        $api = $catalog[$app.Codigo]
    }

    # Preferir VersaoFicheiro (FileVersion do .exe) sobre Versao (DisplayVersion do registo).
    # O installer AIRC nao actualiza DisplayVersion em updates, so na primeira instalacao,
    # logo a verdade dos binarios esta na FileVersion.
    $versaoRegisto  = $app.Versao
    $versaoFicheiro = $app.VersaoFicheiro
    $versaoUsada    = if ($versaoFicheiro) { $versaoFicheiro } else { $versaoRegisto }
    $fonteVersao    = if ($versaoFicheiro) { 'FileVersion' } else { 'Registo' }

    $cmp = $null
    if ($api) { $cmp = Compare-AircVersion -Installed $versaoUsada -Available $api.Versao }

    $estado = if (-not $app.Codigo) {
        'Codigo nao identificado'
    } elseif (-not $api) {
        'Sem dados na API'
    } elseif ($cmp -eq -1) {
        'Desactualizado'
    } elseif ($cmp -eq 0) {
        'Actualizado'
    } elseif ($cmp -eq 1) {
        'Mais recente que API'
    } else {
        'Indeterminado'
    }

    [pscustomobject]@{
        Codigo            = $app.Codigo
        Aplicacao         = $app.DisplayName
        VersaoInstalada   = $versaoUsada
        VersaoRegisto     = $versaoRegisto
        VersaoFicheiro    = $versaoFicheiro
        FonteVersao       = $fonteVersao
        ExePrincipal      = $app.ExePrincipal
        VersaoDisponivel  = if ($api) { $api.Versao } else { $null }
        DataPublicacao    = if ($api -and $api.Data -ne [datetime]::MinValue) {
                                 $api.Data.ToString('yyyy-MM-dd')
                             } else { $null }
        Estado            = $estado
        LinkDownload      = if ($cmp -eq -1 -and $api) { $api.Link } else { $null }
        Designacao        = if ($api) { $api.Designacao } else { $null }
        InstallPath       = $app.InstallPath
        Source            = $app.Source
    }
}

# Output na consola
if (-not $CsvOnly) {
    $sorted = $report | Sort-Object -Property @{Expression='Estado';Descending=$false}, @{Expression='Codigo';Descending=$false}
    foreach ($r in $sorted) {
        $color = switch ($r.Estado) {
            'Actualizado'           { 'Green' }
            'Desactualizado'        { 'Yellow' }
            'Mais recente que API'  { 'Cyan' }
            'Sem dados na API'      { 'DarkGray' }
            'Codigo nao identificado' { 'DarkGray' }
            default                 { 'White' }
        }
        $codeLabel = if ($r.Codigo) { $r.Codigo } else { '?' }
        Write-Host ''
        Write-Host ("[{0}] {1}" -f $codeLabel, $r.Aplicacao) -ForegroundColor White
        Write-Host ("   Instalada  : {0} (via {1})" -f $r.VersaoInstalada, $r.FonteVersao) -ForegroundColor Gray
        if ($r.VersaoFicheiro -and $r.VersaoRegisto -and ($r.VersaoFicheiro -ne $r.VersaoRegisto)) {
            Write-Host ("   (Registo   : {0} - desfasado do binario - normal apos updates)" -f $r.VersaoRegisto) -ForegroundColor DarkGray
        }
        if ($r.VersaoDisponivel) {
            Write-Host ("   Disponivel : {0} ({1})" -f $r.VersaoDisponivel, $r.DataPublicacao) -ForegroundColor Gray
        }
        Write-Host ("   Estado     : {0}" -f $r.Estado) -ForegroundColor $color
        if ($r.LinkDownload) {
            Write-Host ("   Download   : {0}" -f $r.LinkDownload) -ForegroundColor Magenta
        }
    }

    $nActualizadas    = @($report | Where-Object Estado -eq 'Actualizado').Count
    $nDesactualizadas = @($report | Where-Object Estado -eq 'Desactualizado').Count
    $nDesconhecidas   = @($report | Where-Object { $_.Estado -eq 'Sem dados na API' -or $_.Estado -eq 'Codigo nao identificado' }).Count

    Write-Host ''
    Write-Host '----------------------------------------------' -ForegroundColor Cyan
    Write-Host ("Resumo: {0} actualizadas | {1} desactualizadas | {2} sem match | {3} total" -f `
        $nActualizadas, $nDesactualizadas, $nDesconhecidas, $report.Count) -ForegroundColor Cyan
    Write-Host '----------------------------------------------' -ForegroundColor Cyan
    Write-Host ''
}

# CSV de historico
if (-not $NoLog) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logRows = $report | ForEach-Object {
        [pscustomobject]@{
            Timestamp        = $timestamp
            Codigo           = $_.Codigo
            Aplicacao        = $_.Aplicacao
            VersaoInstalada  = $_.VersaoInstalada
            FonteVersao      = $_.FonteVersao
            VersaoRegisto    = $_.VersaoRegisto
            VersaoFicheiro   = $_.VersaoFicheiro
            ExePrincipal     = $_.ExePrincipal
            VersaoDisponivel = $_.VersaoDisponivel
            DataPublicacao   = $_.DataPublicacao
            Estado           = $_.Estado
            LinkDownload     = $_.LinkDownload
            Designacao       = $_.Designacao
            InstallPath      = $_.InstallPath
            Source           = $_.Source
        }
    }
    try {
        $logRows | Export-Csv -Path $LogFile -Append -NoTypeInformation -Encoding UTF8 -Delimiter ';'
        if (-not $CsvOnly) {
            Write-Host ("Log gravado em: {0}" -f $LogFile) -ForegroundColor DarkGray
        }
    } catch {
        Write-Host ("AVISO: nao foi possivel escrever no log ({0}): {1}" -f $LogFile, $_.Exception.Message) -ForegroundColor Yellow
    }
}

# --- Staging: manifest e limpeza automatica ---
# O staged.json regista o que o script descarregou (produto, versao, ficheiros).
# Em cada execucao, pacotes cujo update entretanto foi instalado - ou que foram
# substituidos por versao mais recente - sao removidos, para a pasta de staging
# so mostrar o que esta realmente pendente. So se apaga o que o proprio script
# registou no manifest; conteudo manual na mesma pasta fica intacto.
if (-not $StagingDir) { $StagingDir = Join-Path $PSScriptRoot 'updates-pendentes' }
$stagedManifestPath = Join-Path $StagingDir 'staged.json'

# Varrer temporarios orfaos de downloads interrompidos: um processo morto a
# meio (reboot, tarefa parada) nao consegue apagar o proprio .part. Um .part
# de um download ATIVO esta trancado pelo Windows, logo o Remove-Item falha
# silenciosamente e nao interfere.
if (Test-Path $StagingDir) {
    Get-ChildItem (Join-Path $StagingDir 'airc-tmp-*.part') -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

$stagedEntries = @()
if (Test-Path $stagedManifestPath) {
    try {
        # ForEach-Object enumera o array JSON: no PS 5.1 o ConvertFrom-Json
        # devolve-o como UM item e o @() sozinho criaria array-dentro-de-array
        $stagedEntries = @(Get-Content $stagedManifestPath -Raw -Encoding UTF8 |
            ConvertFrom-Json | ForEach-Object { $_ })
    } catch {
        $stagedEntries = @()
    }
}

if ($stagedEntries.Count -gt 0) {
    $stagingRoot = (Get-Item $StagingDir).FullName.TrimEnd('\') + '\'
    $kept = @()
    foreach ($s in $stagedEntries) {
        $row = $report | Where-Object { $_.Codigo -eq $s.Codigo } | Select-Object -First 1
        $motivo = $null
        if (-not $row) {
            $motivo = 'produto ja nao esta instalado'
        } else {
            $cmp = Compare-AircVersion -Installed $row.VersaoInstalada -Available ([string]$s.Versao)
            if ($null -ne $cmp -and $cmp -ge 0) {
                $motivo = 'update ja instalado'
            } elseif ($row.VersaoDisponivel -and $row.VersaoDisponivel -ne [string]$s.Versao) {
                $motivo = ('substituido pela versao {0}' -f $row.VersaoDisponivel)
            }
        }
        if (-not $motivo) { $kept += $s; continue }

        foreach ($nome in @([string]$s.Ficheiro, [string]$s.PastaExtraida)) {
            if ([string]::IsNullOrWhiteSpace($nome)) { continue }
            $alvo = [System.IO.Path]::GetFullPath((Join-Path $StagingDir $nome))
            # Nunca apagar fora da pasta de staging
            if (-not $alvo.StartsWith($stagingRoot, [System.StringComparison]::OrdinalIgnoreCase)) { continue }
            if (Test-Path $alvo) { Remove-Item $alvo -Recurse -Force -ErrorAction SilentlyContinue }
        }
        Write-Host ("Staging: [{0}] pacote {1} removido ({2})" -f $s.Codigo, $s.Versao, $motivo) -ForegroundColor DarkGray
    }
    if ($kept.Count -ne $stagedEntries.Count) {
        $stagedEntries = $kept
        if ($kept.Count -eq 0) {
            # Sem nada pendente: o INSTALAR.txt antigo tambem ja nao se aplica
            Remove-Item (Join-Path $StagingDir 'INSTALAR.txt') -Force -ErrorAction SilentlyContinue
            Remove-Item $stagedManifestPath -Force -ErrorAction SilentlyContinue
        } else {
            try { ConvertTo-Json @($kept) -Depth 4 | Set-Content -Path $stagedManifestPath -Encoding UTF8 } catch {}
        }
    }
}

# --- Tier 1: Staging dos installers ---
# Descarrega installers das versoes desactualizadas para uma pasta local.
# Nao instala nada. Gera INSTALAR.txt com manifest e notas de seguranca.
if ($Download) {
    $toDownload = @($report | Where-Object { $_.Estado -eq 'Desactualizado' -and $_.LinkDownload })

    if ($toDownload.Count -eq 0) {
        Write-Host ''
        Write-Host 'Nada para descarregar - sem updates pendentes.' -ForegroundColor Green
    } else {
        Write-Host ''
        Write-Host '==============================================' -ForegroundColor Cyan
        Write-Host (' A descarregar {0} installer(s)' -f $toDownload.Count) -ForegroundColor Cyan
        Write-Host (' Destino: {0}' -f $StagingDir) -ForegroundColor Cyan
        Write-Host '==============================================' -ForegroundColor Cyan

        $stagingResults = @()
        foreach ($r in $toDownload) {
            Write-Host ''
            Write-Host ("[{0}] {1}" -f $r.Codigo, $r.Aplicacao) -ForegroundColor White
            Write-Host ("   {0} -> {1}" -f $r.VersaoInstalada, $r.VersaoDisponivel) -ForegroundColor Gray

            # Reutilizar download de execucao anterior da mesma versao - evita
            # re-sacar centenas de MB em cada corrida enquanto o update espera
            # pela instalacao manual
            $res = $null
            $prev = $stagedEntries | Where-Object {
                $_.Codigo -eq $r.Codigo -and [string]$_.Versao -eq [string]$r.VersaoDisponivel
            } | Select-Object -First 1
            if ($prev -and $prev.Ficheiro) {
                $zipPrev = Join-Path $StagingDir ([string]$prev.Ficheiro)
                if (Test-Path $zipPrev) {
                    Write-Host '   Ja em staging de execucao anterior - a reutilizar.' -ForegroundColor DarkGray
                    $res = [pscustomobject]@{
                        Success  = $true
                        Path     = $zipPrev
                        Filename = [string]$prev.Ficheiro
                        Size     = (Get-Item $zipPrev).Length
                    }
                }
            }
            if (-not $res) {
                Write-Host '   A descarregar...' -ForegroundColor DarkGray
                $res = Save-AircInstaller -Url $r.LinkDownload -Destination $StagingDir `
                    -ProductCode $r.Codigo -Version $r.VersaoDisponivel
            }

            if ($res.Success) {
                $sizeMB = [Math]::Round($res.Size / 1MB, 1)
                Write-Host ("   OK: {0} ({1} MB)" -f $res.Filename, $sizeMB) -ForegroundColor Green
            } else {
                Write-Host ("   FALHOU: {0}" -f $res.Error) -ForegroundColor Red
            }

            # Tier 2: extrair o pacote e localizar o installer
            $installerPath = $null
            $extractErr    = $null
            $pkg           = $null
            if ($res.Success -and $Extract) {
                $pkg = Expand-AircPackage -Path $res.Path
                if ($pkg.Success) {
                    $installerPath = $pkg.Installer
                    if ($pkg.Extracted) {
                        Write-Host ("   Extraido: {0}" -f $installerPath) -ForegroundColor Green
                    }
                    if ($pkg.Warning) {
                        Write-Host ("   AVISO: {0}" -f $pkg.Warning) -ForegroundColor Yellow
                    }
                } else {
                    $extractErr = $pkg.Error
                    Write-Host ("   EXTRACCAO FALHOU: {0}" -f $extractErr) -ForegroundColor Red
                }
            }

            $stagingResults += [pscustomobject]@{
                Codigo           = $r.Codigo
                Aplicacao        = $r.Aplicacao
                VersaoInstalada  = $r.VersaoInstalada
                VersaoDisponivel = $r.VersaoDisponivel
                DataPublicacao   = $r.DataPublicacao
                Sucesso          = $res.Success
                Ficheiro         = if ($res.Success) { $res.Filename } else { $null }
                TamanhoBytes     = if ($res.Success) { $res.Size } else { 0 }
                Erro             = if (-not $res.Success) { $res.Error } else { $extractErr }
                LinkOriginal     = $r.LinkDownload
                Installer        = $installerPath
                InstallPath      = $r.InstallPath
            }

            # Registar no manifest de staging (usado pela limpeza automatica e
            # pela reutilizacao de downloads em execucoes seguintes)
            if ($res.Success) {
                $stagedEntries = @($stagedEntries | Where-Object { $_.Codigo -ne $r.Codigo })
                $stagedEntries += [pscustomobject]@{
                    Codigo        = $r.Codigo
                    Versao        = $r.VersaoDisponivel
                    Ficheiro      = $res.Filename
                    PastaExtraida = if ($pkg -and $pkg.Success -and $pkg.ExtractDir) { Split-Path $pkg.ExtractDir -Leaf } else { $null }
                    Data          = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
                }
            }
        }

        # Persistir manifest de staging
        try {
            ConvertTo-Json @($stagedEntries) -Depth 4 | Set-Content -Path $stagedManifestPath -Encoding UTF8
        } catch {}

        # Gerar manifest INSTALAR.txt
        $mdPath = Join-Path $StagingDir 'INSTALAR.txt'
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.AppendLine('===============================================')
        [void]$sb.AppendLine(' UPDATES AIRC PENDENTES - MANIFEST DE INSTALACAO')
        [void]$sb.AppendLine('===============================================')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine(('Gerado em: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')))
        [void]$sb.AppendLine(('Servidor : {0}' -f $env:COMPUTERNAME))
        [void]$sb.AppendLine(('Utilizador: {0}' -f $env:USERNAME))
        [void]$sb.AppendLine('')

        $okList   = @($stagingResults | Where-Object Sucesso)
        $failList = @($stagingResults | Where-Object { -not $_.Sucesso })

        [void]$sb.AppendLine('-----------------------------------------------')
        [void]$sb.AppendLine(' INSTALLERS DESCARREGADOS COM SUCESSO')
        [void]$sb.AppendLine('-----------------------------------------------')
        if ($okList.Count -eq 0) {
            [void]$sb.AppendLine('(nenhum)')
        } else {
            foreach ($r in $okList) {
                $sizeMB = [Math]::Round($r.TamanhoBytes / 1MB, 1)
                [void]$sb.AppendLine('')
                [void]$sb.AppendLine(('[{0}] {1}' -f $r.Codigo, $r.Aplicacao))
                [void]$sb.AppendLine(('   Instalada actual : {0}' -f $r.VersaoInstalada))
                [void]$sb.AppendLine(('   Versao nova      : {0} (publicada {1})' -f $r.VersaoDisponivel, $r.DataPublicacao))
                [void]$sb.AppendLine(('   Ficheiro         : {0}' -f $r.Ficheiro))
                [void]$sb.AppendLine(('   Tamanho          : {0} MB' -f $sizeMB))
            }
        }
        [void]$sb.AppendLine('')

        if ($failList.Count -gt 0) {
            [void]$sb.AppendLine('-----------------------------------------------')
            [void]$sb.AppendLine(' DOWNLOADS FALHADOS')
            [void]$sb.AppendLine('-----------------------------------------------')
            foreach ($r in $failList) {
                [void]$sb.AppendLine('')
                [void]$sb.AppendLine(('[{0}] {1}' -f $r.Codigo, $r.Aplicacao))
                [void]$sb.AppendLine(('   Erro : {0}' -f $r.Erro))
                [void]$sb.AppendLine(('   URL  : {0}' -f $r.LinkOriginal))
            }
            [void]$sb.AppendLine('')
        }

        [void]$sb.AppendLine('-----------------------------------------------')
        [void]$sb.AppendLine(' NOTAS DE INSTALACAO - LER ANTES DE EXECUTAR')
        [void]$sb.AppendLine('-----------------------------------------------')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('1. Janela de manutencao')
        [void]$sb.AppendLine('   - Acordar com os utilizadores uma janela em que as aplicacoes')
        [void]$sb.AppendLine('     AIRC podem ficar offline.')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('2. Backup / snapshot')
        [void]$sb.AppendLine('   - Antes de qualquer instalacao, garantir snapshot da VM ou')
        [void]$sb.AppendLine('     backup da pasta da aplicacao + backup da base de dados.')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('3. Alteracoes de base de dados')
        [void]$sb.AppendLine('   - Algumas versoes AIRC requerem update da BD. Consultar a')
        [void]$sb.AppendLine('     newsletter de cada versao em https://www.airc.pt/suporte')
        [void]$sb.AppendLine('     ANTES de instalar (procurar "Esta versao requer atualizacao')
        [void]$sb.AppendLine('     de Base de Dados").')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('4. Parar aplicacoes e servicos')
        [void]$sb.AppendLine('   - Fechar todas as instancias da aplicacao em uso.')
        [void]$sb.AppendLine('   - Parar servicos Windows relacionados (caso existam).')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('5. Ordem de instalacao')
        [void]$sb.AppendLine('   - Comecar por uma aplicacao menos critica para validar o')
        [void]$sb.AppendLine('     processo.')
        [void]$sb.AppendLine('   - Validar apos cada uma antes de avancar.')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('6. Validacao pos-instalacao')
        [void]$sb.AppendLine('   - Re-correr este script (sem -Download) para confirmar que a')
        [void]$sb.AppendLine('     versao instalada coincide com a versao disponivel.')

        try {
            $sb.ToString() | Set-Content -Path $mdPath -Encoding UTF8
            Write-Host ''
            Write-Host ("Manifest gerado em: {0}" -f $mdPath) -ForegroundColor Cyan
        } catch {
            Write-Host ("AVISO: nao foi possivel escrever manifest ({0}): {1}" -f $mdPath, $_.Exception.Message) -ForegroundColor Yellow
        }

        # --- Tier 3: Instalacao automatica ---
        # Corre os installers extraidos de forma silenciosa. Salvaguardas:
        # exige elevacao, nao instala se a aplicacao tiver processos abertos,
        # e re-verifica a versao do binario no fim.
        if ($Install) {
            $toInstall = @($stagingResults | Where-Object { $_.Sucesso -and $_.Installer })

            $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
                       ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

            Write-Host ''
            Write-Host '==============================================' -ForegroundColor Cyan
            Write-Host (' A instalar {0} update(s)' -f $toInstall.Count) -ForegroundColor Cyan
            Write-Host '==============================================' -ForegroundColor Cyan

            if (-not $isAdmin) {
                Write-Host ''
                Write-Host 'AVISO: sessao sem privilegios de administrador.' -ForegroundColor Yellow
                if ($Unattended) {
                    Write-Host 'Instalacao cancelada em modo nao-assistido (installers exigem elevacao).' -ForegroundColor Yellow
                    $toInstall = @()
                } else {
                    Write-Host 'Os installers podem pedir elevacao (UAC) ou falhar.' -ForegroundColor Yellow
                }
            }

            $installedCodes = @()
            foreach ($s in $toInstall) {
                Write-Host ''
                Write-Host ("[{0}] {1}  ({2} -> {3})" -f $s.Codigo, $s.Aplicacao, $s.VersaoInstalada, $s.VersaoDisponivel) -ForegroundColor White

                $emUso = Test-AircAppInUse -InstallPath $s.InstallPath
                if ($emUso.Count -gt 0) {
                    $nomes = ($emUso | Select-Object -ExpandProperty ProcessName -Unique) -join ', '
                    Write-Host ("   IGNORADO: aplicacao em uso (processos: {0}). Fechar e repetir." -f $nomes) -ForegroundColor Yellow
                    continue
                }

                Write-Host ("   A executar installer: {0}" -f (Split-Path $s.Installer -Leaf)) -ForegroundColor DarkGray
                $inst = Invoke-AircInstaller -Installer $s.Installer -LogDir $LogDir -Unattended:$Unattended
                if ($inst.Success) {
                    Write-Host ("   OK ({0}, exit code {1})" -f $inst.Kind, $inst.ExitCode) -ForegroundColor Green
                    if ($inst.ExitCode -eq 3010) {
                        Write-Host '   NOTA: o sistema precisa de reiniciar para concluir.' -ForegroundColor Yellow
                    }
                    $installedCodes += $s.Codigo
                } else {
                    Write-Host ("   FALHOU ({0}): {1}" -f $inst.Kind, $inst.Error) -ForegroundColor Red
                }
            }

            # Verificacao pos-instalacao: re-varrer o registo/binarios e confirmar
            if ($installedCodes.Count -gt 0) {
                Write-Host ''
                Write-Host 'Verificacao pos-instalacao:' -ForegroundColor Cyan
                $after = @(Get-AircInstalled -Catalog $catalog -ProductCatalog $productCatalog)
                foreach ($code in $installedCodes) {
                    $app = $after | Where-Object { $_.Codigo -eq $code } | Select-Object -First 1
                    $api = $catalog[$code]
                    $versaoNova = if ($app -and $app.VersaoFicheiro) { $app.VersaoFicheiro }
                                  elseif ($app) { $app.Versao } else { $null }
                    $cmp = if ($versaoNova -and $api) {
                        Compare-AircVersion -Installed $versaoNova -Available $api.Versao
                    } else { $null }
                    if ($null -ne $cmp -and $cmp -ge 0) {
                        Write-Host ("   [{0}] {1} - ACTUALIZADO" -f $code, $versaoNova) -ForegroundColor Green
                    } else {
                        Write-Host ("   [{0}] {1} - ainda desfasado da versao {2} (ver log do installer em {3})" -f `
                            $code, $versaoNova, $api.Versao, $LogDir) -ForegroundColor Yellow
                    }
                }
            }
        }
    }
}

if ($Unattended) {
    try { Stop-Transcript | Out-Null } catch {}
}
