ENTITY = {
    "key":         "site_processo_financeiro",
    "label":       "Processo Financeiro",
    "labelPlural": "Processos Financeiros",
    "icon":        "FolderOpen",

    "db": {
        "readView":  "vbl_site_processo_financeiro",
        "writeView": "vbf_site_processo_financeiro",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",              "label": "ID",              "type": "id"},
        {"key": "titulo",          "label": "Título",           "type": "text",   "required": True},
        {"key": "tipo",            "label": "Tipo",             "type": "text",   "readonly": True},
        {"key": "ts_tipo",         "label": "Tipo (ID)",        "type": "number"},
        {"key": "ano_exercicio",   "label": "Ano",              "type": "number", "required": True},
        {"key": "descricao",       "label": "Descrição",        "type": "textarea"},
        {"key": "estado",          "label": "Estado",           "type": "text",   "readonly": True},
        {"key": "visivel",         "label": "Visível",          "type": "boolean"},
        {"key": "num_documentos",  "label": "Nº Documentos",    "type": "number", "readonly": True},
        {"key": "num_publicados",  "label": "Nº Publicados",    "type": "number", "readonly": True},
    ],

    "listView": {
        "columns":     ["titulo", "tipo", "ano_exercicio", "estado", "visivel", "num_documentos"],
        "defaultSort": {"field": "ano_exercicio", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Processo", "fields": ["titulo", "ts_tipo", "ano_exercicio", "ts_estado", "visivel"], "cols": 2},
            {"title": "Descrição","fields": ["descricao"],                                                   "cols": 1},
        ],
    },
}
