// frontend/src/features/Payment/utils/performanceUtils.js

/**
 * Utilitários de performance para o módulo de pagamentos
 */

/**
 * Debounce para inputs
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle para ações repetitivas
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Memoização simples
 */
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * Lazy loading de componentes
 */
export const lazyLoadComponent = (importFunc, delay = 0) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(importFunc());
        }, delay);
    });
};

/**
 * Cache manager
 */
class CacheManager {
    constructor(maxSize = 100, ttl = 300000) { // 5 minutes default TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    set(key, value) {
        // Remove oldest if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    remove(key) {
        this.cache.delete(key);
    }
}

export const paymentCache = new CacheManager();

/**
 * Request queue para evitar requisições simultâneas
 */
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async add(requestFunc) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFunc, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const { requestFunc, resolve, reject } = this.queue.shift();

        try {
            const result = await requestFunc();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            this.process();
        }
    }
}

export const paymentRequestQueue = new RequestQueue();

/**
 * Otimização de re-renders
 */
export const shouldComponentUpdate = (prevProps, nextProps, keysToCheck = []) => {
    if (keysToCheck.length === 0) {
        return JSON.stringify(prevProps) !== JSON.stringify(nextProps);
    }

    return keysToCheck.some(key => prevProps[key] !== nextProps[key]);
};

/**
 * Batch updates
 */
export const batchUpdates = (updates, callback) => {
    Promise.all(updates).then(results => {
        callback(results);
    });
};