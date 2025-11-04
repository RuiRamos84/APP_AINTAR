# Guia de Teste do Dashboard

## Alterações Implementadas

### Backend
- ✅ Atualizado `dashboard_service.py` com 36 views em 4 categorias
- ✅ Atualizado `dashboard_routes.py` com novas rotas
- ✅ Adicionada rota de teste `/dashboard/test`

### Frontend
- ✅ Atualizado `dashboardService.js` com novos métodos
- ✅ Atualizado `constants.js` com estrutura de categorias
- ✅ Criado componente `CategorySelector.js`
- ✅ Atualizado `Dashboard.js` para mostrar dados da nova estrutura
- ✅ Atualizado hook `useDashboardData` para trabalhar com filtros

## Como Testar

### 1. Verificar Logs do Backend

Abra o terminal do backend e verifique se há erros quando aceder ao dashboard.

### 2. Testar Rota de Diagnóstico

No browser, com a aplicação frontend rodando e autenticado:

1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Execute:

```javascript
// Testar se a API responde
fetch('/api/dashboard/test', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Resultado do teste:', data))
.catch(err => console.error('Erro:', err));
```

### 3. Verificar Console do Browser

No Dashboard, abra o DevTools (F12) e vá para:
- **Console**: Verificar mensagens de log e erros
- **Network**: Verificar chamadas à API

Deve ver:
```
Todos os dados do dashboard: {structure: {...}, data: {...}}
```

### 4. Verificar se as Views Existem no Banco de Dados

Execute no terminal do backend:

```bash
cd backend
python test_dashboard_views.py
```

Isto mostrará quais views existem e quais estão em falta.

## Estrutura Esperada da Resposta

A rota `/dashboard/all?year=2025` deve retornar:

```json
{
  "structure": {
    "categories": [
      {
        "id": "pedidos",
        "name": "Pedidos",
        "views": [
          {"id": "vds_pedido_01$001", "name": "Por tipo"},
          ...
        ]
      },
      ...
    ]
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
          "data": [...],
          "columns": [...]
        },
        ...
      }
    },
    ...
  }
}
```

## Possíveis Problemas

### Problema 1: "data: 0, structure: 0"

**Causa**: As views do banco de dados ainda não existem.

**Solução**:
1. Execute o script de teste para identificar views faltantes
2. Crie as views SQL no banco de dados conforme sua estrutura de dados

### Problema 2: Erro de permissões

**Causa**: Utilizador não tem permissão 400 (dashboard.view)

**Solução**: Verificar permissões do utilizador na base de dados

### Problema 3: Erro CORS

**Causa**: Backend não está configurado corretamente

**Solução**: Verificar configuração do CORS no backend

## Próximos Passos

1. **Criar as views SQL** se ainda não existem
2. **Testar cada categoria** individualmente
3. **Adicionar mais visualizações** (gráficos, tabelas, etc.)
4. **Implementar exportação** de dados (PDF, Excel, etc.)

## Exemplo de Views SQL a Criar

Se as views ainda não existem, você precisará criá-las. Exemplo:

```sql
-- Exemplo: vds_pedido_01$001 - Por tipo
CREATE OR REPLACE VIEW aintar_server."vds_pedido_01$001" AS
SELECT
    tipo,
    COUNT(*) as total
FROM aintar_server.tb_pedido
GROUP BY tipo;

-- Exemplo: vds_pedido_01$002 - Por tipo e por ano
CREATE OR REPLACE VIEW aintar_server."vds_pedido_01$002" AS
SELECT
    tipo,
    EXTRACT(YEAR FROM data_criacao) as ano,
    COUNT(*) as total
FROM aintar_server.tb_pedido
GROUP BY tipo, EXTRACT(YEAR FROM data_criacao);
```

## Recursos Adicionais

### Rotas Disponíveis

- `GET /dashboard/structure` - Estrutura do dashboard
- `GET /dashboard/test` - Teste de diagnóstico
- `GET /dashboard/all?year=2025` - Todos os dados
- `GET /dashboard/category/pedidos?year=2025` - Dados de uma categoria
- `GET /dashboard/view/vds_pedido_01$001?year=2025` - Dados de uma view

### Filtros Disponíveis

- `year` - Filtrar por ano (ex: 2025)
- `month` - Filtrar por mês (ex: 1-12)

Exemplo:
```
GET /dashboard/all?year=2025&month=3
```
