// frontend/src/pages/Global/types/index.js

/**
 * @typedef {Object} Entity
 * @property {number} pk
 * @property {string} nome
 * @property {string} ts_entity - Localização
 * @property {string} subsistema
 * @property {number} ativa
 * @property {string} coord_m
 * @property {string} coord_p
 */

/**
 * @typedef {Object} VolumeRecord
 * @property {string} data
 * @property {number} valor
 * @property {string} tt_readspot
 * @property {string} ts_client
 */

/**
 * @typedef {Object} EnergyRecord
 * @property {string} data
 * @property {number} valor_vazio
 * @property {number} valor_ponta
 * @property {number} valor_cheia
 * @property {string} ts_client
 */

/**
 * @typedef {Object} ExpenseRecord
 * @property {string} data
 * @property {string} tt_expensedest
 * @property {number} valor
 * @property {string} memo
 * @property {string} ts_associate
 */

/**
 * @typedef {Object} FormField
 * @property {string} name
 * @property {string} label
 * @property {'text'|'number'|'datetime-local'|'select'} type
 * @property {boolean} required
 * @property {number} size - Grid size
 * @property {Array} options - Para selects
 * @property {boolean} multiline
 * @property {number} rows
 */

export const ENTITY_TYPES = {
    ETAR: 'etar',
    EE: 'ee'
};

export const RECORD_TYPES = {
    VOLUME: 'volume',
    WATER_VOLUME: 'water_volume',
    ENERGY: 'energy',
    EXPENSE: 'expense'
};

export const REQUEST_TYPES = {
    DESMATACAO: 'desmatacao',
    RETIRADA_LAMAS: 'retirada_lamas',
    REPARACAO: 'reparacao',
    VEDACAO: 'vedacao',
    QUALIDADE_AMBIENTAL: 'qualidade_ambiental'
};