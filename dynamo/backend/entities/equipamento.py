ENTITY = {
    "key":         "equipamento",
    "label":       "Equipamento",
    "labelPlural": "Equipamentos",
    "icon":        "Wrench",

    "db": {
        "readView":  "vbl_equipamento",
        "writeView": "vbf_equipamento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                   "label": "ID",       "type": "id"},
        {"key": "tt_equipamento$tipo",  "label": "Tipo",     "type": "select", "meta": "equipamentotipo"},
        {"key": "marca",                "label": "Marca",    "type": "text",   "required": True},
        {"key": "modelo",               "label": "Modelo",   "type": "text"},
        {"key": "serial",               "label": "Nº Série", "type": "text"},
        {"key": "valor",                "label": "Valor (€)","type": "number"},
    ],

    "relations": {
        "alocacoes": {
            "type":       "hasMany",
            "entity":     "equipamento_aloc",
            "foreignKey": "tb_equipamento",
            "label":      "Alocações",
            "icon":       "MapPin",
        },
        "reparacoes": {
            "type":       "hasMany",
            "entity":     "equipamento_repair",
            "foreignKey": "tb_equipamento",
            "label":      "Reparações",
            "icon":       "Hammer",
        },
    },

    "listView": {
        "columns":     ["tt_equipamento$tipo", "marca", "modelo", "serial", "valor"],
        "defaultSort": {"field": "pk", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Identificação",
                "fields": ["tt_equipamento$tipo", "marca", "modelo", "serial"],
                "cols":   2,
            },
            {
                "title":  "Financeiro",
                "fields": ["valor"],
                "cols":   2,
            },
        ],
    },

    "detailView": {
        "tabs": [
            {"label": "Alocações",  "relation": "alocacoes",  "icon": "MapPin"},
            {"label": "Reparações", "relation": "reparacoes", "icon": "Hammer"},
        ],
    },
}
