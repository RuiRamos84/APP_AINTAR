<#
====================================================================
 AINTAR - Aplicação das correções de segurança Fase 1 (git)
====================================================================
 Este script trata das operações que o ambiente Cowork NÃO consegue
 fazer: apagar ficheiros versionados, criar branch, commitar e
 reescrever o histórico do git (segredos SIBS).

 As EDIÇÕES de código (decorators de permissão, rate limiting,
 remoção de endpoints de debug, DOMPurify, lazy loading, .gitignore)
 JÁ FORAM aplicadas aos ficheiros no teu disco. Este script apenas
 commita essas alterações e remove ficheiros que não devem existir.

 COMO USAR:
   1. Fecha editores/IDE que tenham o repo aberto.
   2. Abre PowerShell na raiz do repo (C:\Users\rui.ramos\Desktop\APP).
   3. Lê o script todo antes de correr. Corre por PARTES.
   4. PARTE C (reescrita de histórico) é DESTRUTIVA e irreversível
      no remoto — lê os avisos.

 Nada aqui corre sozinho de uma vez: cada PARTE está separada e
 pensada para copiares/colares consciente do que faz.
====================================================================
#>

# --------------------------------------------------------------------
# PARTE 0 — Verificações de segurança (corre sempre primeiro)
# --------------------------------------------------------------------

# Confirma que estás na raiz do repo
if (-not (Test-Path ".git")) {
    Write-Host "ERRO: não estás na raiz do repositório git. Muda para C:\Users\rui.ramos\Desktop\APP" -ForegroundColor Red
    exit 1
}

# Rede de segurança: backup completo do repo (inclui histórico) antes de mexer
$backup = "..\APP_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').bundle"
git bundle create $backup --all
Write-Host "Backup do repositório criado em: $backup" -ForegroundColor Green
Write-Host "(Se algo correr mal: git clone $backup repo-recuperado)" -ForegroundColor DarkGray

# Verifica sintaxe dos ficheiros backend editados (o mount da sandbox andava
# dessincronizado; esta é a verificação autoritativa na tua máquina)
Write-Host "`n--- Verificação de sintaxe Python ---" -ForegroundColor Cyan
$pyfiles = @(
    "backend\app\routes\emission_routes.py",
    "backend\app\routes\alert_whatsapp_routes.py",
    "backend\app\routes\documents_routes.py",
    "backend\app\routes\website_routes.py",
    "backend\app\services\whatsapp_web_service.py"
)
foreach ($f in $pyfiles) {
    python -c "import ast; ast.parse(open(r'$f', encoding='utf-8').read()); print('OK  $f')"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO de sintaxe em $f — CORRIGE antes de continuar." -ForegroundColor Red
        exit 1
    }
}
Write-Host "Sintaxe OK em todos os ficheiros backend editados." -ForegroundColor Green

Write-Host "`nPARTE 0 concluída. Revê o output acima antes de avançar para a PARTE A." -ForegroundColor Yellow
Write-Host "Corre as PARTES seguintes manualmente (copia/cola cada bloco)." -ForegroundColor Yellow


<#
# ====================================================================
# PARTE A — Branch + remoção de ficheiros + commit das correções
# ====================================================================
# Descomenta este bloco e corre-o depois de a PARTE 0 passar.

git checkout -b fix/seguranca-fase1

# --- A.1 Deixar de versionar pastas de ferramentas (ficam no disco) ---
git rm -r --cached --ignore-unmatch .superpowers .playwright-mcp

# --- A.2 Mover scripts de referência/diagnóstico para pasta ignorada ---
# Os scripts serviram para estudar comportamento (SIBS, permissões, BD).
# Ficam NO DISCO em backend/_dev-scripts/ (já no .gitignore) mas saem do git.
$devDir = "backend\_dev-scripts"
New-Item -ItemType Directory -Force -Path $devDir | Out-Null

$refScripts = @(
    "backend\add_rh_permissions.py",
    "backend\add_session_manager.py",
    "backend\apply_rh_schema.py",
    "backend\check_orcamento_db.py",
    "backend\check_types.py",
    "backend\convert_permissions.py",
    "backend\debug_permissions.py",
    "backend\explore_db.py",
    "backend\fix_imports.py",
    "backend\inspect_dashboard_views.py",
    "backend\json.json",
    "backend\migrate_logging.py",
    "backend\query.py",
    "backend\remove_permissions.py",
    "backend\test_dashboard_views.py",
    # Scripts de teste SIBS/webhook (os *teste_sibs* têm segredos — ver PARTE C)
    "backend\test_webhook_sibs.py",
    "backend\teste_sibes.py",
    "backend\teste_sibs_mbway.py",
    "backend\teste_sibs_ref_mb.py",
    "backend\teste_sibs_status.py",
    "backend\teste_sibs_status_mb.py"
)
foreach ($s in $refScripts) {
    if (Test-Path $s) {
        git rm --cached --ignore-unmatch $s      # deixa de versionar
        Move-Item -Force $s $devDir              # move para a pasta ignorada
    }
}
Write-Host "Scripts de referência movidos para $devDir (fora do git, mantidos no disco)." -ForegroundColor Green

# --- A.3 (OPCIONAL) Duplicado de config e backup de package.json ---
# config.py na raiz é idêntico a backend/config.py. Se confirmares que
# nada o importa, descomenta para deixar de o versionar:
# git rm --cached --ignore-unmatch config.py; Move-Item -Force config.py $devDir
# git rm --ignore-unmatch frontend/package.json.backup   # backup, pode sair de vez

# --- A.4 (OPCIONAL) Ficheiro morto: operationStore.js (não é importado) ---
# Confirmado sem consumidores; o módulo de operações já usa React Query.
# git rm --ignore-unmatch frontend-v2/src/features/operations/store/operationStore.js

# --- A.5 (OPCIONAL) Lixo na raiz — descomenta os que quiseres mesmo remover ---
# git rm --ignore-unmatch brincadeira.vbs
# git rm --ignore-unmatch update_pass.ps1

# --- A.6 Adicionar as edições de código já feitas pelos agentes ---
git add -A

# --- A.7 Commit (conventional, pt-PT) ---
git commit -m "fix(seguranca): remove endpoints debug, protege rotas whatsapp e arquiva scripts

- Remove rotas publicas /debug-test e /test-minimal de emission_routes
- Adiciona require_permission('whatsapp.manage') as 9 rotas em falta
- Remove default hardcoded da WA_API_KEY (falha arranque em producao)
- Rate limiting em create_direct, contacto, avaliacoes e candidatura
- Sanitiza HTML de noticias no website com DOMPurify
- Lazy loading de rotas pesadas do website
- Corrige .gitignore (.superpowers) e deixa de versionar ferramentas
- Move scripts de referencia/diagnostico para backend/_dev-scripts (ignorado)"

Write-Host "PARTE A concluída. Revê com: git show --stat HEAD" -ForegroundColor Green
# Faz merge para master quando estiveres satisfeito:
#   git checkout master; git merge --no-ff fix/seguranca-fase1
# E depois push normal:
#   git push origin master
#>


<#
# ====================================================================
# PARTE B — Rodar os segredos SIBS (fora do git)  [AÇÃO MANUAL]
# ====================================================================
# ANTES da PARTE C, e independentemente dela:
#
#   As assinaturas de transação SIBS que estavam nos teste_sibs_*.py
#   devem ser consideradas comprometidas. Contacta a SIBS / regenera
#   as credenciais do ambiente afetado (qly / produção conforme o caso)
#   e atualiza o .env.production. Reescrever o histórico NÃO invalida
#   segredos que já foram expostos — só os tira do repositório.
#>


<#
# ====================================================================
# PARTE C — Purga dos segredos do HISTÓRICO  [DESTRUTIVO — lê tudo]
# ====================================================================
# AVISOS:
#   * Reescreve TODO o histórico. Os hashes de commit mudam.
#   * Obriga a `git push --force`. Qualquer outro clone/CI que exista
#     tem de ser re-clonado depois (o teu histórico local antigo fica
#     incompatível com o remoto).
#   * Faz isto quando ninguém mais estiver a trabalhar no repo.
#   * O backup .bundle da PARTE 0 é a tua rede de segurança.
#
# Requer git-filter-repo (não vem com o git):
#   pip install git-filter-repo
#
# Recomendado correr numa CLONE FRESCA e espelhada, não no teu working repo:

cd ..
git clone --mirror https://github.com/RuiRamos84/APP_AINTAR.git APP_purge.git
cd APP_purge.git

# Remove os 5 ficheiros com segredos de todo o histórico:
git filter-repo `
    --path backend/teste_sibes.py `
    --path backend/teste_sibs_mbway.py `
    --path backend/teste_sibs_ref_mb.py `
    --path backend/teste_sibs_status.py `
    --path backend/teste_sibs_status_mb.py `
    --invert-paths

# Revê que desapareceram do histórico:
git log --all --oneline -- backend/teste_sibs_mbway.py   # deve vir vazio

# Repor o remoto e forçar (DESTRUTIVO):
git remote add origin https://github.com/RuiRamos84/APP_AINTAR.git
git push --force --mirror origin

# Depois disto: no teu working repo, faz um clone novo do zero para
# ficares alinhado com o histórico reescrito.
Write-Host "PARTE C concluída. Re-clona o repo no teu working dir." -ForegroundColor Green
#>
