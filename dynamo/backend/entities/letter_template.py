ENTITY = {
    "key":         "letter_template",
    "label":       "Modelo de Ofício",
    "labelPlural": "Modelos de Ofício",
    "icon":        "FileEdit",

    "db": {
        "readView":  "vbl_letter_template",
        "writeView": "vbf_letter_template",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",              "label": "ID",          "type": "id"},
        {"key": "name",            "label": "Nome",         "type": "text",   "required": True},
        {"key": "ts_lettertype",   "label": "Tipo",         "type": "text",   "readonly": True},
        {"key": "version",         "label": "Versão",       "type": "number", "readonly": True},
        {"key": "active",          "label": "Ativo",        "type": "boolean"},
        {"key": "body",            "label": "Corpo",        "type": "textarea"},
        {"key": "header_template", "label": "Cabeçalho",    "type": "textarea"},
        {"key": "footer_template", "label": "Rodapé",       "type": "textarea"},
    ],

    "listView": {
        "columns":     ["name", "ts_lettertype", "version", "active"],
        "defaultSort": {"field": "name", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Modelo",    "fields": ["name", "ts_lettertype", "active"],    "cols": 3},
            {"title": "Cabeçalho", "fields": ["header_template"],                    "cols": 1},
            {"title": "Corpo",     "fields": ["body"],                               "cols": 1},
            {"title": "Rodapé",    "fields": ["footer_template"],                    "cols": 1},
        ],
    },
}
