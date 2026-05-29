ENTITY = {
    "key":         "veiculo",
    "label":       "Viatura",
    "labelPlural": "Viaturas",
    "icon":        "Car",

    "db": {
        "readView":  "vbl_vehicle",
        "writeView": "vbf_vehicle",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",               "label": "ID",               "type": "id"},
        {"key": "brand",            "label": "Marca",             "type": "text",   "required": True},
        {"key": "model",            "label": "Modelo",            "type": "text",   "required": True},
        {"key": "licence",          "label": "Matrícula",         "type": "text",   "required": True},
        {"key": "delivery",         "label": "Data Aquisição",    "type": "date"},
        {"key": "inspection_date",  "label": "Próxima Inspeção",  "type": "date"},
        {"key": "insurance_date",   "label": "Validade Seguro",   "type": "date"},
    ],

    "listView": {
        "columns":     ["brand", "model", "licence", "delivery", "inspection_date", "insurance_date"],
        "defaultSort": {"field": "brand", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Identificação",
                "fields": ["brand", "model", "licence"],
                "cols":   3,
            },
            {
                "title":  "Datas",
                "fields": ["delivery", "inspection_date", "insurance_date"],
                "cols":   3,
            },
        ],
    },
}
