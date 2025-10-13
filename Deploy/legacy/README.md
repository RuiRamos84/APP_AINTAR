# Pasta Legacy - Arquivos Obsoletos v1.0

Esta pasta contém arquivos da versão 1.0 do sistema de deployment que utilizava WinRM e CredSSP.

## Arquivos Mantidos para Referência

### Setup-CredSSP.ps1
Script para configurar CredSSP (Credential Security Support Provider) no Windows.

**Status:** Obsoleto na v2.0
**Motivo:** O sistema v2.0 usa Task Scheduler e não requer CredSSP
**Manter porque:** Referência histórica e caso alguém precise configurar CredSSP para outros fins

### TROUBLESHOOTING-WINRM.md
Guia de troubleshooting para problemas relacionados com WinRM.

**Status:** Obsoleto na v2.0
**Motivo:** O sistema v2.0 não usa WinRM
**Manter porque:** Documentação de referência caso alguém queira usar WinRM

### README-OLD.md
README original do sistema v1.0.

**Status:** Obsoleto, substituído por README.md v2.0
**Motivo:** Nova documentação mais completa e atualizada
**Manter porque:** Referência histórica

## Migração v1.0 → v2.0

Se tiver um sistema v1.0 a funcionar, aqui estão as mudanças principais:

| Aspecto | v1.0 (Obsoleto) | v2.0 (Atual) |
|---------|----------------|--------------|
| **Execução remota** | WinRM | Task Scheduler |
| **Porta necessária** | 5985/5986 | 445 (SMB) |
| **Configuração** | Complexa (GPO, CredSSP) | Simples (apenas SMB) |
| **Manutenção** | Scripts .bat externos | PowerShell integrado |
| **Visibilidade backend** | Sempre Session 0 | Configurável |
| **Logs** | Event Viewer | Arquivos + Event Viewer |

## Para Usar v2.0

Volte à pasta principal e use:

```powershell
cd ..
.\Deploy-Main.ps1
```

Consulte [README.md](../README.md) para documentação completa da v2.0.

---

**Nota:** Estes arquivos são mantidos apenas para referência histórica. Não devem ser usados com o sistema v2.0.
