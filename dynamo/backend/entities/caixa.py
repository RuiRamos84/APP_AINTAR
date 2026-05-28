ENTITY = {
    "key":         "caixa",
    "label":       "Movimento de Caixa",
    "labelPlural": "Movimentos de Caixa",
    "icon":        "Wallet",

    "db": {
        "readView":  "vbl_caixa",
        "writeView": "vbf_caixa",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                "label": "ID",           "type": "id"},
        {"key": "data",              "label": "Data",          "type": "date",   "required": True},
        {"key": "tt_caixamovimento", "label": "Tipo",          "type": "text",   "readonly": True},
        {"key": "valor",             "label": "Valor (€)",     "type": "number", "required": True},
        {"key": "saldo",             "label": "Saldo",         "type": "number", "readonly": True},
        {"key": "tb_document",       "label": "Documento",     "type": "text",   "readonly": True},
        {"key": "ordempagamento",    "label": "Ordem Pagamento","type": "text"},
        {"key": "ts_client1",        "label": "Cliente",       "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["data", "tt_caixamovimento", "valor", "saldo", "ts_client1"],
        "defaultSort": {"field": "data", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Movimento",
                "fields": ["data", "tt_caixamovimento", "valor", "ordempagamento"],
                "cols":   2,
            },
        ],
    },
}
