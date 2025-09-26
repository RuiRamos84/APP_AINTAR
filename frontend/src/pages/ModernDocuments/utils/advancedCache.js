/**
 * Sistema de Cache Avançado para Modern Documents
 * - Cache inteligente com TTL
 * - Invalidação automática
 * - Compressão de dados
 * - Persistência local
 * - Analytics de cache
 */

class AdvancedCache {
    constructor(options = {}) {
        this.prefix = options.prefix || 'modern_docs_';
        this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutos
        this.maxSize = options.maxSize || 100; // máximo de entradas
        this.enableCompression = options.enableCompression !== false;

        // Analytics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
            totalSize: 0
        };

        // Cleanup automático
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 2 * 60 * 1000); // limpeza a cada 2 minutos

        // Cache em memória para acesso rápido
        this.memoryCache = new Map();
        this.initializeFromStorage();
    }

    /**
     * Inicializar cache a partir do localStorage
     */
    initializeFromStorage() {
        try {
            const keys = Object.keys(localStorage).filter(key =>
                key.startsWith(this.prefix)
            );

            for (const key of keys) {
                const cacheKey = key.replace(this.prefix, '');
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (this.isValid(parsed)) {
                        this.memoryCache.set(cacheKey, parsed);
                    } else {
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.warn('Erro ao inicializar cache:', error);
        }
    }

    /**
     * Verificar se uma entrada de cache ainda é válida
     */
    isValid(entry) {
        return entry && entry.expiry > Date.now();
    }

    /**
     * Comprimir dados para economia de espaço
     */
    compress(data) {
        if (!this.enableCompression) return data;

        try {
            // Compressão simples - JSON stringify com remoção de espaços
            return JSON.stringify(data);
        } catch (error) {
            console.warn('Erro na compressão:', error);
            return data;
        }
    }

    /**
     * Descomprimir dados
     */
    decompress(data) {
        if (!this.enableCompression) return data;

        try {
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (error) {
            console.warn('Erro na descompressão:', error);
            return data;
        }
    }

    /**
     * Obter item do cache
     */
    get(key) {
        try {
            const cacheEntry = this.memoryCache.get(key);

            if (!cacheEntry) {
                this.stats.misses++;
                return null;
            }

            if (!this.isValid(cacheEntry)) {
                this.delete(key);
                this.stats.misses++;
                return null;
            }

            this.stats.hits++;
            return this.decompress(cacheEntry.data);
        } catch (error) {
            this.stats.errors++;
            console.error('Erro ao obter do cache:', error);
            return null;
        }
    }

    /**
     * Armazenar item no cache
     */
    set(key, data, ttl = null) {
        try {
            const expiry = Date.now() + (ttl || this.defaultTTL);
            const compressed = this.compress(data);

            const cacheEntry = {
                data: compressed,
                expiry,
                timestamp: Date.now(),
                size: JSON.stringify(compressed).length
            };

            // Verificar limite de tamanho
            if (this.memoryCache.size >= this.maxSize) {
                this.evictOldest();
            }

            // Armazenar em memória
            this.memoryCache.set(key, cacheEntry);

            // Armazenar no localStorage
            const storageKey = this.prefix + key;
            localStorage.setItem(storageKey, JSON.stringify(cacheEntry));

            this.stats.sets++;
            this.updateTotalSize();

            return true;
        } catch (error) {
            this.stats.errors++;
            console.error('Erro ao armazenar no cache:', error);
            return false;
        }
    }

    /**
     * Remover item do cache
     */
    delete(key) {
        try {
            this.memoryCache.delete(key);
            localStorage.removeItem(this.prefix + key);
            this.stats.deletes++;
            this.updateTotalSize();
            return true;
        } catch (error) {
            this.stats.errors++;
            console.error('Erro ao remover do cache:', error);
            return false;
        }
    }

    /**
     * Remover entrada mais antiga para liberar espaço
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    /**
     * Limpeza automática de entradas expiradas
     */
    cleanup() {
        const expiredKeys = [];

        for (const [key, entry] of this.memoryCache.entries()) {
            if (!this.isValid(entry)) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => this.delete(key));

        if (expiredKeys.length > 0) {
            console.log(`Cache cleanup: removidas ${expiredKeys.length} entradas expiradas`);
        }
    }

    /**
     * Atualizar tamanho total do cache
     */
    updateTotalSize() {
        let totalSize = 0;
        for (const entry of this.memoryCache.values()) {
            totalSize += entry.size || 0;
        }
        this.stats.totalSize = totalSize;
    }

    /**
     * Invalidar cache baseado em padrão
     */
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        const keysToDelete = [];

        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.delete(key));
        return keysToDelete.length;
    }

    /**
     * Obter ou definir com função de carregamento
     */
    async getOrSet(key, loader, ttl = null) {
        let cached = this.get(key);

        if (cached !== null) {
            return cached;
        }

        try {
            const data = await loader();
            this.set(key, data, ttl);
            return data;
        } catch (error) {
            console.error('Erro ao carregar dados para cache:', error);
            throw error;
        }
    }

    /**
     * Limpar todo o cache
     */
    clear() {
        try {
            // Limpar memória
            this.memoryCache.clear();

            // Limpar localStorage
            const keys = Object.keys(localStorage).filter(key =>
                key.startsWith(this.prefix)
            );
            keys.forEach(key => localStorage.removeItem(key));

            // Reset stats
            this.stats = {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                errors: 0,
                totalSize: 0
            };

            return true;
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            return false;
        }
    }

    /**
     * Obter estatísticas do cache
     */
    getStats() {
        return {
            ...this.stats,
            entries: this.memoryCache.size,
            hitRate: this.stats.hits > 0 ?
                (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%' :
                '0%',
            totalSizeFormatted: this.formatBytes(this.stats.totalSize)
        };
    }

    /**
     * Formatar bytes em formato legível
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Destruir cache e limpar recursos
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Cache específico para documentos
export const documentsCache = new AdvancedCache({
    prefix: 'docs_',
    defaultTTL: 3 * 60 * 1000, // 3 minutos para documentos
    maxSize: 150,
    enableCompression: true
});

// Cache para metadados (mais duradouro)
export const metadataCache = new AdvancedCache({
    prefix: 'meta_',
    defaultTTL: 15 * 60 * 1000, // 15 minutos para metadados
    maxSize: 50,
    enableCompression: true
});

// Utilitários de cache
export const cacheUtils = {
    /**
     * Gerar chave de cache baseada em filtros
     */
    generateFilterKey(filters, searchTerm, sortBy, sortDirection) {
        const filterStr = Object.entries(filters)
            .filter(([key, value]) => value && value !== '')
            .map(([key, value]) => `${key}:${value}`)
            .join('|');

        return `filtered_docs_${filterStr}_search:${searchTerm}_sort:${sortBy}_dir:${sortDirection}`;
    },

    /**
     * Invalidar cache de documentos quando há alterações
     */
    invalidateDocumentCache(documentId = null) {
        if (documentId) {
            documentsCache.invalidatePattern(`.*doc_${documentId}.*`);
        } else {
            documentsCache.invalidatePattern('filtered_docs_.*');
            documentsCache.invalidatePattern('doc_list_.*');
        }
    },

    /**
     * Obter relatório completo de cache
     */
    getCacheReport() {
        return {
            documents: documentsCache.getStats(),
            metadata: metadataCache.getStats(),
            timestamp: new Date().toISOString()
        };
    }
};

export default AdvancedCache;