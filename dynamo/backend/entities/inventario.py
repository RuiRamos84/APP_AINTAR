ENTITY = {
    "key":         "inventario",
    "label":       "Inventário",
    "labelPlural": "Inventários",
    "icon":        "Package",

    "db": {
        "readView":  "vbl_inventory",
        "writeView": "vbf_inventory",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "etar.view",
        "edit": "etar.edit",
    },

    "fields": [
        {"key": "pk",              "label": "ID",              "type": "id"},
        {"key": "tt_inventorytype","label": "Tipo",            "type": "select", "meta": "inventorytype"},
        {"key": "brand",           "label": "Marca",           "type": "text"},
        {"key": "model",           "label": "Modelo",          "type": "text"},
        {"key": "assign_date",     "label": "Data Atribuição", "type": "date"},
        {"key": "assign_who",      "label": "Atribuído a",     "type": "text"},
        {"key": "cost",            "label": "Custo (€)",       "type": "number"},
    ],

    "listView": {
        "columns":     ["tt_inventorytype", "brand", "model", "assign_who", "assign_date", "cost"],
        "defaultSort": {"field": "pk", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Identificação",
                "fields": ["tt_inventorytype", "brand", "model"],
                "cols":   3,
            },
            {
                "title":  "Atribuição",
                "fields": ["assign_date", "assign_who", "cost"],
                "cols":   3,
            },
        ],
    },
}
