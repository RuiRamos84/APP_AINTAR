import React from 'react';

/**
 * Sistema de Analytics de UX para Modern Documents
 * - Tracking de interactions do usuário
 * - Métricas de performance de UX
 * - Heatmap de cliques
 * - Análise de user journey
 * - A/B testing support
 */

class UXAnalytics {
    constructor(options = {}) {
        this.sessionId = this.generateSessionId();
        this.userId = options.userId || 'anonymous';
        this.enabled = options.enabled !== false;
        this.debug = options.debug || false;
        this.batchSize = options.batchSize || 10;
        this.flushInterval = options.flushInterval || 30000; // 30 segundos

        // Armazenamento local de eventos
        this.eventQueue = [];
        this.sessionData = {
            startTime: Date.now(),
            pageViews: 0,
            interactions: 0,
            errors: 0,
            performance: {
                loadTimes: [],
                actionTimes: []
            }
        };

        // Métricas de UX
        this.uxMetrics = {
            clickHeatmap: new Map(),
            userFlows: [],
            featureUsage: new Map(),
            errorPatterns: [],
            performanceIssues: []
        };

        if (this.enabled) {
            this.initialize();
        }
    }

    /**
     * Inicializar analytics
     */
    initialize() {
        // Auto-flush de eventos
        this.flushTimer = setInterval(() => {
            this.flushEvents();
        }, this.flushInterval);

        // Tracking de performance
        this.trackPageLoad();

        // Event listeners globais
        this.setupGlobalListeners();

        this.log('UX Analytics inicializado', { sessionId: this.sessionId });
    }

    /**
     * Gerar ID único de sessão
     */
    generateSessionId() {
        return `ux_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Configurar listeners globais
     */
    setupGlobalListeners() {
        // Tracking de cliques
        document.addEventListener('click', (event) => {
            this.trackClick(event);
        }, true);

        // Tracking de erros
        window.addEventListener('error', (event) => {
            this.trackError(event.error, 'javascript_error');
        });

        // Tracking de unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(event.reason, 'promise_rejection');
        });

        // Tracking de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            this.trackPageVisibility();
        });
    }

    /**
     * Logging interno
     */
    log(message, data = {}) {
        if (this.debug) {
            console.log(`[UX Analytics] ${message}`, data);
        }
    }

    /**
     * Adicionar evento à fila
     */
    addEvent(eventType, data = {}) {
        if (!this.enabled) return;

        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            sessionId: this.sessionId,
            userId: this.userId,
            type: eventType,
            timestamp: Date.now(),
            url: window.location.pathname,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            ...data
        };

        this.eventQueue.push(event);

        // Flush automático se a fila estiver cheia
        if (this.eventQueue.length >= this.batchSize) {
            this.flushEvents();
        }
    }

    /**
     * Tracking de carregamento de página
     */
    trackPageLoad() {
        if (!performance || !performance.timing) return;

        const timing = performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        this.sessionData.performance.loadTimes.push(loadTime);
        this.sessionData.pageViews++;

        this.addEvent('page_load', {
            loadTime,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstPaint: this.getFirstPaint(),
            resources: this.getResourceTiming()
        });
    }

    /**
     * Obter tempo de primeiro paint
     */
    getFirstPaint() {
        if (!performance.getEntriesByType) return null;

        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
        return firstPaint ? firstPaint.startTime : null;
    }

    /**
     * Obter dados de recursos carregados
     */
    getResourceTiming() {
        if (!performance.getEntriesByType) return [];

        const resources = performance.getEntriesByType('resource');
        return resources.slice(-10).map(resource => ({
            name: resource.name.split('/').pop(),
            duration: resource.duration,
            size: resource.transferSize
        }));
    }

    /**
     * Tracking de cliques
     */
    trackClick(event) {
        const target = event.target;
        const elementInfo = this.getElementInfo(target);

        // Atualizar heatmap
        const clickKey = `${elementInfo.tag}:${elementInfo.classes}:${elementInfo.text}`;
        const currentCount = this.uxMetrics.clickHeatmap.get(clickKey) || 0;
        this.uxMetrics.clickHeatmap.set(clickKey, currentCount + 1);

        this.sessionData.interactions++;

        this.addEvent('click', {
            element: elementInfo,
            coordinates: {
                x: event.clientX,
                y: event.clientY
            },
            modifiers: {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey
            }
        });
    }

    /**
     * Obter informações do elemento
     */
    getElementInfo(element) {
        return {
            tag: element.tagName?.toLowerCase() || '',
            id: element.id || '',
            classes: Array.from(element.classList || []).join(' '),
            text: element.textContent?.substring(0, 50) || '',
            type: element.type || '',
            role: element.role || element.getAttribute('aria-label') || '',
            dataset: { ...element.dataset }
        };
    }

    /**
     * Tracking de ações específicas
     */
    trackAction(action, category = 'user_action', metadata = {}) {
        const startTime = Date.now();

        // Retornar função para marcar o fim da ação
        return (success = true, additionalData = {}) => {
            const duration = Date.now() - startTime;

            this.sessionData.performance.actionTimes.push(duration);

            // Tracking de uso de features
            const featureKey = `${category}:${action}`;
            const currentUsage = this.uxMetrics.featureUsage.get(featureKey) || { count: 0, avgDuration: 0 };
            currentUsage.count++;
            currentUsage.avgDuration = ((currentUsage.avgDuration * (currentUsage.count - 1)) + duration) / currentUsage.count;
            this.uxMetrics.featureUsage.set(featureKey, currentUsage);

            this.addEvent('action', {
                action,
                category,
                duration,
                success,
                metadata: { ...metadata, ...additionalData }
            });
        };
    }

    /**
     * Tracking de erros
     */
    trackError(error, category = 'error', context = {}) {
        this.sessionData.errors++;

        const errorInfo = {
            message: error?.message || String(error),
            stack: error?.stack || '',
            category,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Padrões de erro
        this.uxMetrics.errorPatterns.push({
            ...errorInfo,
            timestamp: Date.now()
        });

        this.addEvent('error', errorInfo);

        this.log('Erro trackado', errorInfo);
    }

    /**
     * Tracking de user journey/fluxo
     */
    trackUserFlow(step, flowId = 'default', metadata = {}) {
        const flow = {
            flowId,
            step,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionData.startTime,
            metadata
        };

        this.uxMetrics.userFlows.push(flow);

        this.addEvent('user_flow', flow);
    }

    /**
     * Tracking de visibilidade da página
     */
    trackPageVisibility() {
        const isVisible = !document.hidden;

        this.addEvent('page_visibility', {
            visible: isVisible,
            sessionTime: Date.now() - this.sessionData.startTime
        });
    }

    /**
     * Tracking de performance de feature
     */
    trackFeaturePerformance(feature, metrics) {
        if (metrics.responseTime > 2000) {
            this.uxMetrics.performanceIssues.push({
                feature,
                issue: 'slow_response',
                value: metrics.responseTime,
                timestamp: Date.now()
            });
        }

        this.addEvent('feature_performance', {
            feature,
            ...metrics
        });
    }

    /**
     * A/B Testing support
     */
    trackABTest(testName, variant, outcome = null) {
        this.addEvent('ab_test', {
            testName,
            variant,
            outcome
        });
    }

    /**
     * Enviar eventos para servidor
     */
    async flushEvents() {
        if (this.eventQueue.length === 0) return;

        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];

        try {
            // Em ambiente de produção, enviar para endpoint de analytics
            if (process.env.NODE_ENV === 'production') {
                await fetch('/api/analytics/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: this.sessionId,
                        events: eventsToSend
                    })
                });
            }

            // Em desenvolvimento, armazenar localmente
            else {
                const stored = JSON.parse(localStorage.getItem('ux_analytics_events') || '[]');
                stored.push(...eventsToSend);

                // Manter apenas os últimos 1000 eventos
                const recentEvents = stored.slice(-1000);
                localStorage.setItem('ux_analytics_events', JSON.stringify(recentEvents));
            }

            this.log(`${eventsToSend.length} eventos enviados`);

        } catch (error) {
            // Em caso de erro, recolocar eventos na fila
            this.eventQueue.unshift(...eventsToSend);
            this.log('Erro ao enviar eventos', error);
        }
    }

    /**
     * Obter relatório de sessão
     */
    getSessionReport() {
        const sessionDuration = Date.now() - this.sessionData.startTime;

        return {
            sessionId: this.sessionId,
            userId: this.userId,
            duration: sessionDuration,
            ...this.sessionData,
            uxMetrics: {
                topClicks: Array.from(this.uxMetrics.clickHeatmap.entries())
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10),
                topFeatures: Array.from(this.uxMetrics.featureUsage.entries())
                    .sort(([,a], [,b]) => b.count - a.count)
                    .slice(0, 10),
                recentErrors: this.uxMetrics.errorPatterns.slice(-5),
                recentFlow: this.uxMetrics.userFlows.slice(-10)
            }
        };
    }

    /**
     * Limpar dados da sessão
     */
    clearSession() {
        this.sessionData = {
            startTime: Date.now(),
            pageViews: 0,
            interactions: 0,
            errors: 0,
            performance: {
                loadTimes: [],
                actionTimes: []
            }
        };

        this.uxMetrics = {
            clickHeatmap: new Map(),
            userFlows: [],
            featureUsage: new Map(),
            errorPatterns: [],
            performanceIssues: []
        };
    }

    /**
     * Destruir analytics
     */
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        // Enviar eventos restantes
        this.flushEvents();

        this.log('UX Analytics destruído');
    }
}

// Instância global
export const uxAnalytics = new UXAnalytics({
    enabled: true,
    debug: process.env.NODE_ENV === 'development'
});

// Utilitários de tracking
export const trackingUtils = {
    /**
     * HOC para tracking de componentes
     */
    withTracking: (WrappedComponent, componentName) => {
        return React.forwardRef((props, ref) => {
            const trackAction = (action, metadata = {}) => {
                return uxAnalytics.trackAction(action, 'component', {
                    component: componentName,
                    ...metadata
                });
            };

            return React.createElement(WrappedComponent, {
                ...props,
                ref,
                trackAction
            });
        });
    },

    /**
     * Hook para tracking
     */
    useTracking: (componentName) => {
        return {
            trackAction: (action, metadata = {}) =>
                uxAnalytics.trackAction(action, 'component', {
                    component: componentName,
                    ...metadata
                }),
            trackError: (error, context = {}) =>
                uxAnalytics.trackError(error, 'component_error', {
                    component: componentName,
                    ...context
                }),
            trackFlow: (step, metadata = {}) =>
                uxAnalytics.trackUserFlow(step, componentName, metadata)
        };
    }
};

export default UXAnalytics;