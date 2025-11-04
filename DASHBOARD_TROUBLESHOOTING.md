# Dashboard - Troubleshooting Guide

## Problema Atual
O dashboard está a mostrar apenas os KPIs (números) mas não está a mostrar os gráficos/visualizações.

## Dados Visíveis
✅ **KPIs a funcionar:**
- Categorias: 4
- Visualizações: 36
- Estrutura: 4
- Pedidos: 364 registos (17 views)
- Ramais: 31 registos (4 views)
- Fossas: 19 registos (3 views)
- Instalações: 0 registos (12 views)

## Checklist de Diagnóstico

### 1. Verificar Console do Browser
```
1. Abrir DevTools (F12)
2. Ir para aba "Console"
3. Procurar por erros (texto em vermelho)
4. Procurar por logs "ChartContainer -"
```

**O que procurar:**
- ❌ Erros de import (Recharts, Framer Motion)
- ❌ Erros de renderização
- ✅ Logs "ChartContainer - Charts processados: [...]"

### 2. Verificar Network Tab
```
1. DevTools (F12) > Network
2. Recarregar página
3. Procurar por /dashboard/all
```

**Verificar:**
- ✅ Status 200 OK
- ✅ Response tem `data` com categorias
- ✅ Cada categoria tem `views`
- ✅ Cada view tem `data` com array de objectos

### 3. Verificar se Tabs estão visíveis
```
Deve ver 3 tabs:
- 📊 Visão Geral
- 📈 Análise Detalhada
- 📋 Dados Tabulares
```

**Se não vê as tabs:**
- Problema no componente CategorySelector
- Verificar se está a ocupar toda a altura

### 4. Clicar nas Tabs
```
1. Clicar em "Visão Geral" (primeira tab)
2. Clicar em "Dados Tabulares" (terceira tab)
```

**Comportamento esperado:**
- Tab "Dados Tabulares" deve mostrar tabela imediatamente
- Se tabela aparece mas gráficos não = problema no ChartContainer

## Soluções Rápidas

### Solução 1: Scroll da Página
```
Fazer scroll para baixo na página
```
Os gráficos podem estar abaixo do viewport.

### Solução 2: Selecionar uma Categoria
```
1. Clicar em "Pedidos" no CategorySelector
2. Verificar se gráficos aparecem
```

### Solução 3: Limpar Cache do Browser
```
1. Ctrl + Shift + R (Windows)
2. Cmd + Shift + R (Mac)
```

### Solução 4: Verificar se Backend está a retornar dados corretos
```bash
# No terminal, fazer request manual:
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:5000/api/dashboard/all
```

## Estrutura de Dados Esperada

O backend deve retornar:
```json
{
  "structure": {
    "categories": [...]
  },
  "data": {
    "pedidos": {
      "category": "pedidos",
      "views": {
        "vds_pedido_01$001": {
          "view_id": "vds_pedido_01$001",
          "name": "Por tipo",
          "category": "pedidos",
          "total": 10,
          "data": [
            {"tipo": "A", "total": 5},
            {"tipo": "B", "total": 3}
          ],
          "columns": ["tipo", "total"]
        }
      }
    }
  }
}
```

## Próximos Passos

1. **Abrir Console** e enviar print dos logs
2. **Abrir Network** e enviar print do response de `/dashboard/all`
3. **Verificar se tabs estão visíveis** e enviar print
4. **Clicar na tab "Dados Tabulares"** e ver se tabela aparece

Com essas informações consigo identificar exatamente o problema!
