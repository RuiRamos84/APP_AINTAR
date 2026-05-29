ENTITY = {
    "key":         "instalacao_incumprimento",
    "label":       "Incumprimento",
    "labelPlural": "Incumprimentos",
    "icon":        "AlertOctagon",

    "db": {
        "readView":  "vbl_instalacao_incumprimento",
        "writeView": "vbf_instalacao_incumprimento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",             "label": "ID",         "type": "id"},
        {"key": "tb_instalacao",  "label": "Instalação", "type": "relation",
         "relation": {"type": "belongsTo", "entity": "instalacao", "displayField": "nome"}, "required": True},
        {"key": "tt_analiseparam","label": "Parâmetro",  "type": "text",   "readonly": True},
        {"key": "resultado",      "label": "Resultado",  "type": "number"},
        {"key": "limite",         "label": "Limite",     "type": "number"},
        {"key": "falha",          "label": "Falha",      "type": "number", "readonly": True},
        {"key": "data",           "label": "Data",       "type": "date",   "required": True},
        {"key": "operador1",      "label": "Operador 1", "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["data", "tb_instalacao", "tt_analiseparam", "resultado", "limite", "falha"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Incumprimento", "fields": ["tb_instalacao", "data", "tt_analiseparam", "resultado", "limite"], "cols": 2},
        ],
    },
}
