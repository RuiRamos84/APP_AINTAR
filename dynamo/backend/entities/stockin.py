ENTITY = {
    "key":         "stockin",
    "label":       "Entrada de Stock",
    "labelPlural": "Entradas de Stock",
    "icon":        "PackagePlus",

    "db": {
        "readView":  "vbl_stockin",
        "writeView": "vbf_stockin",
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
        {"key": "price",        "label": "Preço (€)",  "type": "number"},
    ],

    "listView": {
        "columns":     ["tt_stockitem", "tt_stocktype", "date", "quantity", "price"],
        "defaultSort": {"field": "date", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Entrada", "fields": ["tt_stockitem", "date", "quantity", "price"], "cols": 2},
        ],
    },
}
