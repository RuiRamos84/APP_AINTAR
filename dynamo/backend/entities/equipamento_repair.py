ENTITY = {
    "key":         "equipamento_repair",
    "label":       "Reparação de Equipamento",
    "labelPlural": "Reparações de Equipamentos",
    "icon":        "Hammer",

    "db": {
        "readView":  "vbl_equipamento_repair",
        "writeView": "vbf_equipamento_repair",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",         "type": "id"},
        {"key": "tb_equipamento","label": "Equipamento","type": "relation",
         "relation": {"type": "belongsTo", "entity": "equipamento", "displayField": "marca"}, "required": True},
        {"key": "data",         "label": "Data",        "type": "date"},
        {"key": "valor",        "label": "Custo (€)",   "type": "number"},
        {"key": "memo",         "label": "Descrição",   "type": "textarea"},
    ],

    "listView": {
        "columns":     ["tb_equipamento", "data", "valor", "memo"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Reparação",
                "fields": ["tb_equipamento", "data", "valor"],
                "cols":   3,
            },
            {
                "title":  "Descrição",
                "fields": ["memo"],
                "cols":   1,
            },
        ],
    },
}
