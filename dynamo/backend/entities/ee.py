ENTITY = {
    "key":         "ee",
    "label":       "Estação Elevatória",
    "labelPlural": "Estações Elevatórias",
    "icon":        "Zap",

    "db": {
        "readView":  "vbl_ee",
        "writeView": "vbf_ee",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",          "type": "id"},
        {"key": "nome",         "label": "Nome",         "type": "text",   "required": True},
        {"key": "tt_freguesia", "label": "Freguesia",    "type": "select", "meta": "freguesia"},
        {"key": "subsistema",   "label": "Subsistema",   "type": "text"},
        {"key": "ener_cpe",     "label": "CPE Energia",  "type": "text"},
        {"key": "ativa",        "label": "Ativa",        "type": "boolean"},
    ],

    "relations": {
        "equipamentos": {
            "type":       "hasMany",
            "entity":     "equipamento_aloc",
            "foreignKey": "pk_instalacao",
            "label":      "Equipamentos",
            "icon":       "Wrench",
        },
        "operacoes": {
            "type":       "hasMany",
            "entity":     "operacao",
            "foreignKey": "pk_instalacao",
            "label":      "Operações",
            "icon":       "ClipboardList",
        },
        "metas": {
            "type":       "hasMany",
            "entity":     "operacaometa",
            "foreignKey": "pk_instalacao",
            "label":      "Metas",
            "icon":       "CalendarClock",
        },
        "analises": {
            "type":       "hasMany",
            "entity":     "instalacao_analise",
            "foreignKey": "pk_instalacao",
            "label":      "Análises",
            "icon":       "FlaskConical",
        },
        "incumprimentos": {
            "type":       "hasMany",
            "entity":     "instalacao_incumprimento",
            "foreignKey": "tb_instalacao",
            "label":      "Incumprimentos",
            "icon":       "AlertOctagon",
        },
        "leituras_energia": {
            "type":       "hasMany",
            "entity":     "instalacao_energyread",
            "foreignKey": "tb_instalacao",
            "label":      "Energia",
            "icon":       "Zap",
        },
        "leituras_volume": {
            "type":       "hasMany",
            "entity":     "instalacao_volumeread",
            "foreignKey": "tb_instalacao",
            "label":      "Volume",
            "icon":       "Droplets",
        },
        "leituras_agua": {
            "type":       "hasMany",
            "entity":     "instalacao_waterread",
            "foreignKey": "tb_instalacao",
            "label":      "Caudal",
            "icon":       "Waves",
        },
        "despesas": {
            "type":       "hasMany",
            "entity":     "expense",
            "foreignKey": "tb_instalacao",
            "label":      "Despesas",
            "icon":       "Receipt",
        },
    },

    "listView": {
        "columns":     ["nome", "tt_freguesia", "subsistema", "ener_cpe", "ativa"],
        "defaultSort": {"field": "nome", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Identificação",
                "fields": ["nome", "tt_freguesia", "subsistema", "ener_cpe", "ativa"],
                "cols":   2,
            },
        ],
    },

    "detailView": {
        "tabs": [
            {"label": "Equipamentos",  "relation": "equipamentos",    "icon": "Wrench"},
            {"label": "Operações",     "relation": "operacoes",       "icon": "ClipboardList"},
            {"label": "Metas",         "relation": "metas",           "icon": "CalendarClock"},
            {"label": "Análises",      "relation": "analises",        "icon": "FlaskConical"},
            {"label": "Incumprimentos","relation": "incumprimentos",  "icon": "AlertOctagon"},
            {"label": "Energia",       "relation": "leituras_energia","icon": "Zap"},
            {"label": "Volume",        "relation": "leituras_volume", "icon": "Droplets"},
            {"label": "Caudal",        "relation": "leituras_agua",   "icon": "Waves"},
            {"label": "Despesas",      "relation": "despesas",        "icon": "Receipt"},
        ],
    },
}
