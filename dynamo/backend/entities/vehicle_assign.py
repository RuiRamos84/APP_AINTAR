ENTITY = {
    "key":         "vehicle_assign",
    "label":       "Atribuição de Viatura",
    "labelPlural": "Atribuições de Viaturas",
    "icon":        "UserCheck",

    "db": {
        "readView":  "vbl_vehicle_assign",
        "writeView": "vbf_vehicle_assign",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",         "label": "ID",          "type": "id"},
        {"key": "brand",      "label": "Marca",        "type": "text",   "readonly": True},
        {"key": "model",      "label": "Modelo",       "type": "text",   "readonly": True},
        {"key": "licence",    "label": "Matrícula",    "type": "text",   "readonly": True},
        {"key": "data",       "label": "Data",         "type": "date"},
        {"key": "ts_client",  "label": "Condutor",     "type": "text",   "readonly": True},
        {"key": "tb_vehicle", "label": "Viatura (ID)", "type": "number"},
    ],

    "listView": {
        "columns":     ["brand", "licence", "ts_client", "data"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Atribuição",
                "fields": ["tb_vehicle", "ts_client", "data"],
                "cols":   3,
            },
        ],
    },
}
