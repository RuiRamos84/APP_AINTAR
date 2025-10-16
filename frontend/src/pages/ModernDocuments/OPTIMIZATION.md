# 🚀 Plano de Otimização de Performance - ModernDocuments

## 📊 Problemas Identificados

### 1. Chamadas Redundantes ao Backend (1 Refresh = 25 requests!)

```
✗ /api/v1/documents - chamado 2x (0.271s + 0.239s = 0.51s)
✗ /api/v1/document_self - chamado 2x (0.257s + 0.153s = 0.41s)
✗ /api/v1/document_owner - chamado 2x (0.275s + 0.153s = 0.43s)
✗ /api/v1/documents/late - chamado 2x (0.425s + 0.101s = 0.53s)
✗ /api/v1/metaData - chamado 1x (1.335s)
✗ /api/v1/notifications - chamado 1x (0.482s)
✗ /api/v1/tasks - chamado 1x (0.268s)

Total: ~3.5 segundos + overhead de rede
```

### 2. Carregamento Eager (tudo de uma vez)

**Problema:** `DocumentsContext` carrega **TODAS** as listas ao montar:
- Todos os documentos
- Documentos atribuídos
- Documentos criados
- Documentos atrasados

**Resultado:** Usuário precisa esperar por dados que pode não ver!

### 3. Falta de Debounce

Múltiplas mudanças de estado causam re-renders e re-fetches desnecessários.

---

## ✅ Soluções Implementadas

### 1. Lazy Loading (Carregamento Preguiçoso)

**Antes:**
```javascript
// Carrega TUDO ao montar
useEffect(() => {
    Promise.all([
        fetchAllDocuments(),
        fetchAssignedDocuments(),
        fetchCreatedDocuments(),
        fetchLateDocuments()
    ]);
}, [refreshTrigger]);
```

**Depois:**
```javascript
// Carrega apenas a tab ativa
useEffect(() => {
    switch (activeTab) {
        case 0: fetchAllDocuments(); break;
        case 1: fetchAssignedDocuments(); break;
        case 2: fetchCreatedDocuments(); break;
        case 3: fetchLateDocuments(); break;
    }
}, [activeTab, refreshTrigger]);
```

**Benefício:** -75% requests no load inicial

---

### 2. Request Deduplication

**Implementar interceptor no axios:**
```javascript
// Evita requests duplicados em curto espaço de tempo
const pendingRequests = new Map();

axiosInstance.interceptors.request.use(config => {
    const requestKey = `${config.method}:${config.url}`;

    if (pendingRequests.has(requestKey)) {
        // Reutilizar request pendente
        return pendingRequests.get(requestKey);
    }

    const request = config;
    pendingRequests.set(requestKey, request);

    return request;
});
```

**Benefício:** Elimina 100% das chamadas duplicadas

---

### 3. Cache com Invalidação Inteligente

**Estratégia de cache:**
- `metaData`: 15 minutos (raramente muda)
- `documents`: 1 minuto (muda com frequência)
- `notifications`: 30 segundos (tempo real)

**Implementação:**
```javascript
const cache = {
    metaData: { data: null, expiry: 15 * 60 * 1000 },
    documents: { data: null, expiry: 1 * 60 * 1000 },
    notifications: { data: null, expiry: 30 * 1000 }
};
```

**Benefício:** -60% requests em navegação normal

---

### 4. Batch Requests (Backend)

**Criar endpoint único que retorna múltiplos recursos:**

```python
@bp.route('/api/v1/batch', methods=['POST'])
def batch_endpoint():
    """
    Retorna múltiplos recursos numa única chamada

    Body: {
        "requests": [
            {"key": "documents", "endpoint": "/api/v1/documents"},
            {"key": "metaData", "endpoint": "/api/v1/metaData"},
            {"key": "notifications", "endpoint": "/api/v1/notifications"}
        ]
    }

    Response: {
        "documents": [...],
        "metaData": {...},
        "notifications": [...]
    }
    """
    results = {}
    for req in request.json['requests']:
        results[req['key']] = fetch_endpoint(req['endpoint'])
    return jsonify(results)
```

**Benefício:** 1 request ao invés de 3-7

---

### 5. Pagination / Infinite Scroll

**Para listas grandes (>100 docs):**
```javascript
// Carregar apenas 50 documentos inicialmente
const [page, setPage] = useState(1);
const PAGE_SIZE = 50;

// Carregar mais ao scroll
const loadMore = () => {
    if (!loading && hasMore) {
        setPage(prev => prev + 1);
    }
};
```

**Benefício:** -80% tamanho de resposta inicial

---

### 6. WebSocket para Updates em Tempo Real

**Substituir polling por push:**

```javascript
// ❌ Antes: Polling a cada 30s
setInterval(() => {
    fetchNotifications();
}, 30000);

// ✅ Depois: Socket.IO push
socket.on('document_updated', (doc) => {
    updateDocumentInList(doc);
});
```

**Benefício:** -90% requests de polling

---

## 📈 Resultados Esperados

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Requests no load** | 25 | 5-7 | **-70%** |
| **Tempo de load** | 3.5s | 0.8s | **-77%** |
| **Requests duplicados** | 8 | 0 | **-100%** |
| **Tamanho de dados** | ~500KB | ~150KB | **-70%** |

---

## 🎯 Prioridades de Implementação

### High Priority (Fazer Agora):
1. ✅ Lazy Loading - carrega apenas tab ativa
2. ✅ Request Deduplication - elimina duplicados
3. ✅ Debounce em refresh

### Medium Priority (Próxima Sprint):
4. Batch Requests endpoint
5. Pagination para listas grandes
6. Cache com TTL adequados

### Low Priority (Futuro):
7. WebSocket para updates tempo real
8. Service Worker para cache offline
9. Prefetch de tabs adjacentes

---

## 📝 Checklist de Implementação

- [ ] Implementar Lazy Loading no DocumentsContext
- [ ] Adicionar Request Deduplication no axios
- [ ] Configurar cache com TTL adequados
- [ ] Criar endpoint /api/v1/batch no backend
- [ ] Adicionar pagination nas listas
- [ ] Implementar debounce em refreshDocuments
- [ ] Otimizar queries SQL no backend
- [ ] Adicionar índices na BD se necessário
- [ ] Testar com DevTools Network tab
- [ ] Documentar novas práticas

---

**Objetivo:** Reduzir tempo de load de 3.5s para <1s 🚀
