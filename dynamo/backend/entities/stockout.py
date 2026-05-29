ENTITY = {
    "key":         "stockout",
    "label":       "Saída de Stock",
    "labelPlural": "Saídas de Stock",
    "icon":        "PackageMinus",

    "db": {
        "readView":  "vbl_stockout",
        "writeView": "vbf_stockout",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",        "type": "id"},
        {"key": "tt_stockitem", "label": "Artigo",     "type": "text",   "readonly": True},
        {"key": "tt_stocktype", "label": "Categoria",  "type": "text",   "readonly": True},
        {"key": "tt_unit",      "label": "Unidade",    "type": "text",   "readonly": True},
        {"key": "date",         "label": "Data",       "type": "date",   "required": True},
        {"key": "quantity",     "label": "Quantidade", "type": "number", "required": True},
        {"key": "dest_place",   "label": "Destino",    "type": "text",   "readonly": True},
        {"key": "dest_type",    "label": "Tipo Dest.", "type": "text",   "readonly": True},
        {"key": "dest_descr",   "label": "Descrição",  "type": "text"},
    ],

    "listView": {
        "columns":     ["tt_stockitem", "tt_stocktype", "date", "quantity", "dest_place"],
        "defaultSort": {"field": "date", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Saída", "fields": ["tt_stockitem", "date", "quantity", "dest_descr"], "cols": 2},
        ],
    },
}
