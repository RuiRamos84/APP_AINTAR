ENTITY = {
    "key":         "instalacao_analise",
    "label":       "Análise",
    "labelPlural": "Análises",
    "icon":        "FlaskConical",

    "db": {
        "readView":  "vbl_instalacao_analise",
        "writeView": "vbf_instalacao_analise",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",              "label": "ID",          "type": "id"},
        {"key": "data",            "label": "Data",         "type": "date",   "required": True},
        {"key": "pk_instalacao",   "label": "Instalação",   "type": "relation",
         "relation": {"type": "belongsTo", "entity": "instalacao", "displayField": "nome"}},
        {"key": "tb_instalacao",   "label": "Instalação",   "type": "text",   "readonly": True},
        {"key": "tt_analiseponto", "label": "Ponto",        "type": "text",   "readonly": True},
        {"key": "tt_analiseparam", "label": "Parâmetro",    "type": "text",   "readonly": True},
        {"key": "tt_analiseforma", "label": "Forma",        "type": "text",   "readonly": True},
        {"key": "resultado",       "label": "Resultado",    "type": "number", "required": True},
        {"key": "operador1",       "label": "Operador 1",   "type": "text",   "readonly": True},
        {"key": "operador2",       "label": "Operador 2",   "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["data", "tb_instalacao", "tt_analiseparam", "resultado", "operador1"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Análise", "fields": ["pk_instalacao", "data", "tt_analiseponto", "tt_analiseparam", "tt_analiseforma", "resultado"], "cols": 2},
        ],
    },
}
