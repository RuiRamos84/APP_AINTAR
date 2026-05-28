ENTITY = {
    "key":         "instalacao_waterread",
    "label":       "Leitura de Água",
    "labelPlural": "Leituras de Água",
    "icon":        "Waves",

    "db": {
        "readView":  "vbl_instalacao_waterread",
        "writeView": "tb_instalacao_waterread",
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
        {"key": "valor",        "label": "Caudal (m³)",   "type": "number", "required": True},
        {"key": "ts_client",    "label": "Registado por", "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["tb_instalacao", "data", "valor"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Leitura Água", "fields": ["tb_instalacao", "data", "valor"], "cols": 3},
        ],
    },
}
