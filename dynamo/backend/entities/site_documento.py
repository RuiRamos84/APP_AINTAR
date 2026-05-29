ENTITY = {
    "key":         "site_documento",
    "label":       "Documento do Site",
    "labelPlural": "Documentos do Site",
    "icon":        "FileDown",

    "db": {
        "readView":  "vbl_site_documento",
        "writeView": "vbf_site_documento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",          "type": "id"},
        {"key": "titulo",       "label": "Título",       "type": "text",   "required": True},
        {"key": "descricao",    "label": "Descrição",    "type": "textarea"},
        {"key": "categoria",    "label": "Categoria",    "type": "text",   "readonly": True},
        {"key": "ts_categoria", "label": "Categoria(ID)","type": "number"},
        {"key": "subcategoria", "label": "Subcategoria", "type": "text"},
        {"key": "ano",          "label": "Ano",          "type": "number"},
        {"key": "ficheiro_url", "label": "Ficheiro URL", "type": "text"},
        {"key": "ordem",        "label": "Ordem",        "type": "number"},
        {"key": "ativo",        "label": "Ativo",        "type": "boolean"},
    ],

    "listView": {
        "columns":     ["titulo", "categoria", "subcategoria", "ano", "ativo"],
        "defaultSort": {"field": "ordem", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Documento", "fields": ["titulo", "ts_categoria", "subcategoria", "ano", "ordem", "ativo"], "cols": 2},
            {"title": "Ficheiro",  "fields": ["ficheiro_url"],                                                     "cols": 1},
            {"title": "Descrição", "fields": ["descricao"],                                                        "cols": 1},
        ],
    },
}
