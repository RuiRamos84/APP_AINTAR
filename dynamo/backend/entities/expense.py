ENTITY = {
    "key":         "expense",
    "label":       "Despesa",
    "labelPlural": "Despesas",
    "icon":        "Receipt",

    "db": {
        "readView":  "vbl_expense",
        "writeView": "tb_expense",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",             "label": "ID",         "type": "id"},
        {"key": "data",           "label": "Data",       "type": "date",   "required": True},
        {"key": "tt_expensetype", "label": "Tipo",       "type": "select", "meta": "expensetype"},
        {"key": "tb_instalacao",  "label": "Instalação", "type": "relation",
         "relation": {"type": "belongsTo", "entity": "instalacao", "displayField": "nome"}},
        {"key": "tt_expensedest", "label": "Destino",    "type": "text",   "readonly": True},
        {"key": "valor",          "label": "Valor (€)",  "type": "number", "required": True},
        {"key": "ts_client",      "label": "Colaborador","type": "text",   "readonly": True},
        {"key": "ts_associate",   "label": "Associado a","type": "text",   "readonly": True},
        {"key": "memo",           "label": "Observações","type": "textarea"},
    ],

    "listView": {
        "columns":     ["data", "tt_expensetypevalue", "tt_expensedest", "valor", "ts_client"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Despesa",
                "fields": ["data", "tt_expensetype", "valor", "ts_client"],
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
