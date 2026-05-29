ENTITY = {
    "key":         "vehicle_maintenance",
    "label":       "Manutenção de Viatura",
    "labelPlural": "Manutenções de Viaturas",
    "icon":        "Wrench",

    "db": {
        "readView":  "vbl_vehicle_maintenance",
        "writeView": "vbf_vehicle_maintenance",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                "label": "ID",           "type": "id"},
        {"key": "brand",             "label": "Marca",         "type": "text",   "readonly": True},
        {"key": "model",             "label": "Modelo",        "type": "text",   "readonly": True},
        {"key": "licence",           "label": "Matrícula",     "type": "text",   "readonly": True},
        {"key": "tt_maintenancetype","label": "Tipo",          "type": "text",   "readonly": True},
        {"key": "data",              "label": "Data",          "type": "date"},
        {"key": "price",             "label": "Custo (€)",     "type": "number"},
        {"key": "memo",              "label": "Observações",   "type": "textarea"},
        {"key": "tb_vehicle",        "label": "Viatura (ID)",  "type": "number"},
    ],

    "listView": {
        "columns":     ["brand", "licence", "tt_maintenancetype", "data", "price"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Manutenção",
                "fields": ["tb_vehicle", "tt_maintenancetype", "data", "price"],
                "cols":   2,
            },
            {
                "title":  "Notas",
                "fields": ["memo"],
                "cols":   1,
            },
        ],
    },
}
