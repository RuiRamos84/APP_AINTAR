# AIRC Version Checker

Verifica as aplicações AIRC instaladas contra as versões publicadas na API pública
de [airc.pt](https://www.airc.pt), e opcionalmente descarrega, extrai e instala os
updates de forma automática.

## Ficheiros

| Ficheiro | Função |
|---|---|
| `verificar-airc.ps1` | Script principal (verificar / descarregar / extrair / instalar) |
| `configurar-tarefa-agendada.ps1` | Cria/remove a tarefa agendada do Windows |
| `relatorio-airc.csv` | Histórico de todas as verificações (append) |
| `updates-pendentes/` | Staging por defeito (a tarefa agendada usa `C:\AIRC_Updates`) |
| `logs/` | Transcripts das execuções agendadas + logs dos installers |

No staging vivem: os pacotes descarregados, as pastas extraídas, o `INSTALAR.txt`
(manifest humano) e o `staged.json` (manifest do script — regista o que ele próprio
descarregou, para a limpeza automática e a reutilização de downloads).

## Níveis de automação (tiers)

```powershell
# Tier 0 — só verificar (tabela na consola + CSV)
.\verificar-airc.ps1

# Tier 1 — verificar + descarregar installers das versões desactualizadas
.\verificar-airc.ps1 -Download

# Tier 2 — + extrair os .zip e localizar o setup.exe/.msi dentro de cada pacote
.\verificar-airc.ps1 -Extract

# Tier 3 — + executar os installers silenciosamente e verificar a versão no fim
# (SÓ MANUAL, numa consola elevada / Administrador — nunca agendado)
.\verificar-airc.ps1 -Install
```

Cada nível implica os anteriores (`-Install` ⇒ `-Extract` ⇒ `-Download`).

## Execução automática (tarefa agendada)

A tarefa agendada faz **verificação + download + extração — nunca instala**.
É uma decisão deliberada: algumas versões AIRC requerem update de base de dados
e janela de manutenção, por isso o passo de instalação é sempre humano.

Numa consola **elevada**:

```powershell
# Dias úteis (segunda a sexta, 07:30) — cadência recomendada
.\configurar-tarefa-agendada.ps1 -DiasUteis

# Semanal (segunda-feira 07:30)
.\configurar-tarefa-agendada.ps1

# Diária, 7 dias, às 06:00
.\configurar-tarefa-agendada.ps1 -Diaria -Hora 06:00

# Remover a tarefa
.\configurar-tarefa-agendada.ps1 -Remover

# Testar imediatamente
Start-ScheduledTask -TaskName 'AIRC - Verificador de Versoes'
```

O ciclo de vida do staging (`C:\AIRC_Updates` por defeito na tarefa) é automático:

1. **Update detetado** → pacote descarregado e extraído, `INSTALAR.txt` gerado
2. **Update ainda pendente na execução seguinte** → o download anterior é
   **reutilizado** (não re-saca centenas de MB), a extração é reconstruída
3. **Update entretanto instalado** (ou substituído por versão mais nova) → o zip
   e a pasta extraída são **removidos automaticamente** na verificação seguinte,
   para o staging só mostrar o que está realmente pendente

A limpeza só toca no que está registado no `staged.json` (ou seja, no que o
próprio script descarregou) — conteúdo colocado manualmente na pasta fica intacto.

O fluxo humano resume-se a: apareceu uma pasta no staging → ler o `INSTALAR.txt`
(e a newsletter da versão em airc.pt/suporte), agendar a janela, e correr o
installer extraído **como administrador** (ou `.\verificar-airc.ps1 -Install`).

A tarefa corre como `SYSTEM` com privilégios elevados, grava transcript em
`logs\run-*.log` (retenção: 30 ficheiros) e mantém o histórico em `relatorio-airc.csv`.

## Salvaguardas na instalação automática

- **Aplicação em uso** → o installer é ignorado (lista os processos abertos); repetir depois de fechar.
- **Installer de tipo desconhecido** → em modo `-Unattended` é ignorado (não fica pendurado sem sessão gráfica); em modo interactivo abre a UI normal. Tipos reconhecidos com switches silenciosos: MSI, Inno Setup, InstallShield (MSI-based), NSIS.
- **Sem elevação** → em `-Unattended` a fase de instalação é cancelada.
- **Verificação pós-instalação** → depois de instalar, o registo e a FileVersion do binário são relidos e comparados com o catálogo.
- Exit codes aceites: `0` (OK) e `3010` (OK, requer reboot — assinalado na consola/log).

## ⚠️ Antes de correr `-Install` (manual)

1. **Updates de base de dados**: algumas versões AIRC requerem atualização da BD.
   Consultar a newsletter de cada versão em <https://www.airc.pt/suporte> — o script
   não consegue validar isto automaticamente.
2. **Backup/snapshot** da VM ou da pasta das aplicações + BD antes da janela de
   atualização — o script não faz backups.
3. **Aplicações fechadas**: o script recusa instalar se detetar processos abertos
   na pasta da aplicação, mas convém garantir a janela de manutenção com os
   utilizadores antes.

## Notas técnicas

- Compatível com Windows PowerShell 5.1 e PowerShell 7+.
- A extração usa `[System.IO.Compression.ZipFile]` (não `Expand-Archive`) porque os
  downloads sem `Content-Disposition` ficam com extensão `.bin` e o cmdlet recusa
  extensões diferentes de `.zip`. E é feita **entrada-a-entrada** (não
  `ExtractToDirectory`) porque os zips AIRC/SharePoint trazem entradas de diretoria
  com dados ("Zip entry name ends in directory separator character but contains
  data"), que a API rejeita por inteiro — visto em produção com o `BD26_SNC_26_67.zip`.
- O download temporário fica na própria pasta de staging (`.part`) e não em `%TEMP%`:
  um `Move-Item` vindo de `C:\Windows\Temp` arrasta o ACL restritivo de lá quando a
  tarefa corre como SYSTEM, deixando o zip ilegível para os administradores.
- A detecção do tipo de installer lê o `VersionInfo` e procura assinaturas de texto
  no início e no fim do binário (o Inno Setup guarda a sua no final).
- `-Diagnose` mostra o mapa de matching código↔designação para depurar aplicações
  não reconhecidas; aliases manuais em `$KnownAliases` no topo do script.
