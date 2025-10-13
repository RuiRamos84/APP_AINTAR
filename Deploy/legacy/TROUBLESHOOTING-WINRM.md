# Troubleshooting: Problemas de WinRM e CredSSP

## Problema: Erro de delegação de credenciais CredSSP

### Sintoma
```
O cliente WinRM não pode processar o pedido. Uma política do computador não permite
a delegação das credenciais de utilizador para o computador de destino.
```

### Causa
Este erro ocorre quando o sistema tenta usar CredSSP (Credential Security Support Provider)
para autenticação remota, mas as políticas de grupo do Windows não estão configuradas
corretamente para permitir a delegação de credenciais.

---

## Solução 1: DESABILITAR CredSSP (RECOMENDADO - MAIS RÁPIDO)

Esta é a solução mais simples e rápida. O sistema funcionará perfeitamente sem CredSSP
para a maioria dos casos de uso.

### Passos:
1. Abra o arquivo `DeployConfig.ps1`
2. Localize a linha: `UseCredSSP = $false`
3. Certifique-se de que está definido como `$false` (já está configurado)
4. Execute o deployment novamente

**✅ Esta solução já foi aplicada automaticamente!**

### Quando usar esta solução:
- Se você não precisa fazer "double-hop authentication" (acessar outros recursos a partir do servidor remoto)
- Se você quer uma solução rápida e simples
- Se você não tem privilégios de administrador

---

## Solução 2: CONFIGURAR CredSSP (Apenas se necessário)

Use esta solução apenas se precisar de CredSSP (autenticação de "double-hop").

### Requisitos:
- Privilégios de Administrador no computador local
- WinRM habilitado no servidor remoto

### Passos Automáticos:
1. Abra PowerShell **como Administrador**
2. Navegue até a pasta Deploy:
   ```powershell
   cd C:\Users\rui.ramos\Desktop\APP\Deploy
   ```
3. Execute o script de configuração:
   ```powershell
   .\Setup-CredSSP.ps1
   ```
4. Siga as instruções na tela
5. Após a conclusão, abra `DeployConfig.ps1` e altere:
   ```powershell
   UseCredSSP = $true
   ```

### Passos Manuais (se o script automático falhar):

#### 1. Habilitar CredSSP no Cliente
```powershell
# Executar como Administrador
Enable-WSManCredSSP -Role Client -DelegateComputer "172.16.2.35" -Force
```

#### 2. Configurar Política de Grupo
1. Pressione `Win + R` e digite: `gpedit.msc`
2. Navegue até:
   ```
   Configuração do Computador
   → Modelos Administrativos
   → Sistema
   → Delegação de Credenciais
   ```
3. Habilite a política: **"Permitir Delegação de Credenciais Novas"**
4. Clique em **"Mostrar..."** e adicione:
   ```
   WSMAN/172.16.2.35
   WSMAN/*.seudominio.com
   ```
5. Faça o mesmo para: **"Permitir Delegação de Credenciais Novas com autenticação de servidor somente NTLM"**
6. Clique em **"OK"** e feche o editor

#### 3. Atualizar Política de Grupo
```powershell
gpupdate /force
```

#### 4. Reiniciar o computador (recomendado)
```powershell
Restart-Computer
```

---

## Solução 3: VERIFICAR SERVIDOR REMOTO

Se ainda tiver problemas, verifique o servidor remoto (172.16.2.35):

### 1. Verificar se WinRM está habilitado
Execute no servidor:
```powershell
winrm quickconfig
```

### 2. Habilitar CredSSP no Servidor (se usar Solução 2)
Execute no servidor como Administrador:
```powershell
Enable-WSManCredSSP -Role Server -Force
```

### 3. Verificar Firewall
Certifique-se de que as portas estão abertas:
- **Porta 5985** (WinRM HTTP)
- **Porta 5986** (WinRM HTTPS)

```powershell
# No servidor, verificar regras de firewall
Get-NetFirewallRule -DisplayName "*WinRM*" | Select-Object DisplayName, Enabled
```

---

## Diagnóstico de Problemas

### Testar conectividade básica
```powershell
Test-NetConnection -ComputerName 172.16.2.35 -Port 5985
```

### Verificar estado do CredSSP
```powershell
Get-WSManCredSSP
```

### Testar comando remoto simples
```powershell
$cred = Get-Credential
Invoke-Command -ComputerName 172.16.2.35 -Credential $cred -ScriptBlock { $env:COMPUTERNAME }
```

---

## Comparação: CredSSP vs Negotiate

| Característica | CredSSP | Negotiate |
|---------------|---------|-----------|
| Configuração | Complexa (requer GPO) | Simples (padrão) |
| Double-hop | ✅ Suportado | ❌ Não suportado |
| Segurança | Alta (delegação controlada) | Alta (sem delegação) |
| Casos de uso | Acesso a recursos remotos | Comandos diretos no servidor |

**Para este sistema de deployment, Negotiate é suficiente!**

---

## Notas de Segurança

### CredSSP
- ⚠️ CredSSP permite delegação de credenciais
- ⚠️ Configure apenas para servidores confiáveis
- ⚠️ Evite usar em redes não confiáveis
- ⚠️ Mantenha a lista de servidores permitidos atualizada

### Negotiate
- ✅ Mais seguro (sem delegação)
- ✅ Não requer configuração especial
- ✅ Suficiente para a maioria dos casos

---

## Referências

- [Microsoft Docs: CredSSP](https://docs.microsoft.com/en-us/windows/win32/secauthn/credential-security-support-provider)
- [PowerShell Remoting Security](https://docs.microsoft.com/en-us/powershell/scripting/security/remoting/winrmsecurity)
- [Enable-WSManCredSSP](https://docs.microsoft.com/en-us/powershell/module/microsoft.wsman.management/enable-wsmancredssp)

---

## Suporte

Se continuar com problemas:
1. Verifique os logs em: `C:\Users\rui.ramos\Desktop\APP\deployment.log`
2. Execute a opção **"12. DIAGNOSTICO - Verificar permissoes WinRM"** no menu principal
3. Certifique-se de que o servidor remoto está acessível e com WinRM habilitado
