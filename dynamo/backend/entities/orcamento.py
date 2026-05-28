ENTITY = {
    "key":         "orcamento",
    "label":       "Orçamento",
    "labelPlural": "Orçamentos",
    "icon":        "PieChart",

    "db": {
        "readView":  "vbl_orcamento",
        "writeView": "vbf_orcamento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                    "label": "ID",         "type": "id"},
        {"key": "ano",                   "label": "Ano",         "type": "number", "required": True},
        {"key": "classe",                "label": "Classe",      "type": "text",   "readonly": True},
        {"key": "subclasse",             "label": "Subclasse",   "type": "text",   "readonly": True},
        {"key": "name",                  "label": "Designação",  "type": "text"},
        {"key": "valor",                 "label": "Valor (€)",   "type": "number"},
        {"key": "memo",                  "label": "Observações", "type": "textarea"},
    ],

    "listView": {
        "columns":     ["ano", "classe", "subclasse", "name", "valor"],
        "defaultSort": {"field": "ano", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Orçamento",
                "fields": ["ano", "name", "valor"],
                "cols":   3,
            },
            {
                "title":  "Notas",
                "fields": ["memo"],
                "cols":   1,
            },
        ],
    },
}
