// frontend/src/pages/Operation/utils/constants.js
export const OPERATION_CONSTANTS = {
    USERS: {
        SYSTEM_OPERATOR: 81,
        AUTO_COMPLETION: 0
    },

    UI: {
        CARD_HEIGHT: {
            DESKTOP: 200,
            TABLET: 140,
            MOBILE: 120
        },
        TOUCH_TARGET: 48,
        SWIPE_THRESHOLD: 50
    },

    TIMEOUTS: {
        GESTURE_MAX: 300,
        LONG_PRESS: 500,
        DEBOUNCE_SEARCH: 300,
        API_TIMEOUT: 30000
    },

    CACHE: {
        OPERATIONS_TTL: 300000,
        METADATA_TTL: 3600000
    },

    PAGINATION: {
        DEFAULT_SIZE: 50,
        MAX_SIZE: 100,
        VIRTUALIZE_THRESHOLD: 100
    },

    BOOLEAN_PARAMS: [
        "Gratuito",
        "Gratuita",
        "Existência de sanemento até 20 m",
        "Existência de rede de água",
        "Urgência"
    ],

    STATUS: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    }
};