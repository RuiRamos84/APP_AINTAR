// frontend/src/pages/Operation/utils/logger.js
class Logger {
    static levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
    static currentLevel = process.env.NODE_ENV === 'development' ? 3 : 1;

    static log(level, message, context = {}) {
        if (Logger.levels[level] > Logger.currentLevel) return;

        const logData = {
            timestamp: new Date().toISOString(),
            level,
            message,
            module: 'operations',
            ...context
        };

        console[level.toLowerCase()](JSON.stringify(logData, null, 2));
        
        if (process.env.NODE_ENV === 'production' && level === 'ERROR') {
            Logger.sendToService(logData);
        }
    }

    static error(message, context) {
        Logger.log('ERROR', message, context);
    }

    static warn(message, context) {
        Logger.log('WARN', message, context);
    }

    static info(message, context) {
        Logger.log('INFO', message, context);
    }

    static debug(message, context) {
        Logger.log('DEBUG', message, context);
    }

    static async sendToService(logData) {
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
        } catch (e) {
            console.error('Failed to send log:', e);
        }
    }
}

export { Logger };
