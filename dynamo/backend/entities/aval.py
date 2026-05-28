ENTITY = {
    "key":         "aval",
    "label":       "Avaliação",
    "labelPlural": "Avaliações",
    "icon":        "Star",

    "db": {
        "readView":  "vbl_aval",
        "writeView": "tb_aval",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                  "label": "ID",              "type": "id"},
        {"key": "year",                "label": "Ano",              "type": "number",  "readonly": True},
        {"key": "descr",               "label": "Período",          "type": "text",    "readonly": True},
        {"key": "ts_target",           "label": "Avaliado",         "type": "text",    "readonly": True},
        {"key": "aval_personal_colab", "label": "Pessoal (Colab.)", "type": "number"},
        {"key": "aval_personal_rel",   "label": "Pessoal (Rel.)",   "type": "number"},
        {"key": "aval_professional",   "label": "Profissional",     "type": "number"},
    ],

    "listView": {
        "columns":     ["year", "ts_target", "aval_personal_colab", "aval_personal_rel", "aval_professional"],
        "defaultSort": {"field": "year", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Avaliação", "fields": ["ts_target", "aval_personal_colab", "aval_personal_rel", "aval_professional"], "cols": 2},
        ],
    },
}
