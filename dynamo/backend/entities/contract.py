ENTITY = {
    "key":         "contract",
    "label":       "Contrato",
    "labelPlural": "Contratos",
    "icon":        "FileText",

    "db": {
        "readView":  "vbl_contract",
        "writeView": "vbf_contract",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                   "label": "ID",           "type": "id"},
        {"key": "ts_entity",            "label": "Entidade",     "type": "text",     "readonly": True},
        {"key": "start_date",           "label": "Início",       "type": "date"},
        {"key": "stop_date",            "label": "Fim",          "type": "date"},
        {"key": "tt_contractfrequency", "label": "Periodicidade","type": "select",   "meta": "contractfrequency"},
        {"key": "address",              "label": "Morada",       "type": "text"},
        {"key": "postal",               "label": "Cód. Postal",  "type": "text"},
        {"key": "nut3",                 "label": "Município",    "type": "text"},
        {"key": "nut4",                 "label": "Freguesia",    "type": "text"},
    ],

    "listView": {
        "columns":     ["ts_entity", "start_date", "stop_date", "tt_contractfrequency"],
        "defaultSort": {"field": "start_date", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Contrato",
                "fields": ["ts_entity", "start_date", "stop_date", "tt_contractfrequency"],
                "cols":   2,
            },
            {
                "title":  "Morada",
                "fields": ["address", "postal", "nut3", "nut4"],
                "cols":   2,
            },
        ],
    },
}
