ENTITY = {
    "key":         "operacaometa",
    "label":       "Meta de Operação",
    "labelPlural": "Metas de Operação",
    "icon":        "CalendarClock",

    "db": {
        "readView":  "vbl_operacaometa",
        "writeView": "vbf_operacaometa",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",               "label": "ID",           "type": "id"},
        {"key": "tt_operacaomodo",  "label": "Modo",         "type": "text",   "readonly": True},
        {"key": "tb_instalacao",    "label": "Instalação",   "type": "text",   "readonly": True},
        {"key": "tt_operacaodia",   "label": "Dia Semana",   "type": "text",   "readonly": True},
        {"key": "tt_operacaoaccao", "label": "Ação",         "type": "text",   "readonly": True},
        {"key": "ts_operador1",     "label": "Operador 1",   "type": "text",   "readonly": True},
        {"key": "ts_operador2",     "label": "Operador 2",   "type": "text",   "readonly": True},
        {"key": "pk_instalacao",    "label": "Instalação",   "type": "relation",
         "relation": {"type": "belongsTo", "entity": "instalacao", "displayField": "nome"}},
        {"key": "pk_operacaoaccao", "label": "Ação (ID)",    "type": "number"},
        {"key": "pk_operador1",     "label": "Operador1(ID)","type": "number"},
    ],

    "listView": {
        "columns":     ["tt_operacaomodo", "tb_instalacao", "tt_operacaodia", "tt_operacaoaccao", "ts_operador1"],
        "defaultSort": {"field": "pk", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Meta", "fields": ["pk_instalacao", "pk_operacaoaccao", "tt_operacaomodo", "tt_operacaodia", "pk_operador1"], "cols": 2},
        ],
    },
}
