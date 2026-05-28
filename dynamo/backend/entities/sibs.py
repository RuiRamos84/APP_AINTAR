ENTITY = {
    "key":         "sibs",
    "label":       "Pagamento SIBS",
    "labelPlural": "Pagamentos SIBS",
    "icon":        "CreditCard",

    "db": {
        "readView":  "vbl_sibs",
        "writeView": "vbf_sibs",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",               "label": "ID",              "type": "id"},
        {"key": "order_id",         "label": "Order ID",         "type": "text",   "readonly": True},
        {"key": "transaction_id",   "label": "Transação",        "type": "text",   "readonly": True},
        {"key": "amount",           "label": "Montante (€)",     "type": "number", "readonly": True},
        {"key": "payment_method",   "label": "Método",           "type": "text",   "readonly": True},
        {"key": "payment_status",   "label": "Estado",           "type": "text",   "readonly": True},
        {"key": "payment_reference","label": "Referência",       "type": "text",   "readonly": True},
        {"key": "entity",           "label": "Entidade",         "type": "text",   "readonly": True},
        {"key": "regnumber",        "label": "Nº Registo",       "type": "text",   "readonly": True},
        {"key": "created_at",       "label": "Data",             "type": "date",   "readonly": True},
        {"key": "validated_at",     "label": "Validado em",      "type": "date",   "readonly": True},
        {"key": "validator_name",   "label": "Validado por",     "type": "text",   "readonly": True},
    ],

    "listView": {
        "columns":     ["regnumber", "entity", "amount", "payment_method", "payment_status", "created_at"],
        "defaultSort": {"field": "created_at", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Pagamento",  "fields": ["order_id", "transaction_id", "amount", "payment_method", "payment_status", "payment_reference"], "cols": 2},
            {"title": "Validação",  "fields": ["validated_at", "validator_name"],                                                                 "cols": 2},
        ],
    },
}
