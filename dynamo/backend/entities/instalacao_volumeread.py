ENTITY = {
    "key":         "instalacao_volumeread",
    "label":       "Leitura de Volume",
    "labelPlural": "Leituras de Volume",
    "icon":        "Droplets",

    "db": {
        "readView":  "vbl_instalacao_volumeread",
        "writeView": "tb_instalacao_volumeread",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",           "type": "id"},
        {"key": "tb_instalacao","label": "Instalação",    "type": "relation",
         "relation": {"type": "belongsTo", "entity": "instalacao", "displayField": "nome"}, "required": True},
        {"key": "data",         "label": "Data",          "type": "date",   "required": True},
        {"key": "valor",        "label": "Volume (m³)",   "type": "number", "required": True},
        {"key": "tt_readspot",  "label": "Ponto Leitura", "type": "text",   "readonly": True},
        {"key": "ts_client",    "label": "Registado por", "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["tb_instalacao", "data", "valor", "tt_readspot"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Leitura Volume", "fields": ["tb_instalacao", "data", "valor"], "cols": 3},
        ],
    },
}
