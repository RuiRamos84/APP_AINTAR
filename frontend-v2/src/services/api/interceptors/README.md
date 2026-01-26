# ⚠️ DEPRECATED - API Interceptors

## Status: NÃO USAR

Os ficheiros nesta pasta (`requestInterceptor.js` e `responseInterceptor.js`) estão **deprecated** e não devem ser usados.

## Motivo

Havia duplicação de interceptors:
- `client.js` configurava interceptors usando `useAuthStore` (Zustand)
- `AuthManager.js` também configurava seus próprios interceptors

Isso causava:
- Tokens injetados duas vezes
- Inconsistência entre localStorage['user'] e localStorage['auth-storage']
- Possíveis race conditions

## Solução Atual

**Todos os interceptors são agora geridos pelo `AuthManager.setupApiInterceptors()`**

Localização: `src/services/auth/AuthManager.js`

O AuthManager:
1. Lê o token de `localStorage['user']` (fonte única de verdade)
2. Injeta o header `Authorization: Bearer <token>`
3. Gerencia refresh automático de tokens
4. Trata erros 401/403
5. Previne loops de refresh

## Migração Completa

✅ **Antes:**
```javascript
// client.js
setupRequestInterceptor(apiClient);  // ❌ Duplicado!
setupResponseInterceptor(apiClient); // ❌ Duplicado!
```

✅ **Agora:**
```javascript
// AuthManager.js (na inicialização)
this.setupApiInterceptors(); // ✅ Fonte única
```

## Ficheiros Mantidos

Estes ficheiros são mantidos apenas para:
- Referência histórica
- Backup de lógica
- Possível restauração em caso de problemas

**NÃO devem ser importados ou usados em código novo!**

## Data da Mudança

11 de Janeiro de 2025

## Se Precisar de Adicionar Lógica aos Interceptors

Edite diretamente em: `src/services/auth/AuthManager.js` no método `setupApiInterceptors()`
