ENTITY = {
    "key":         "site_noticia",
    "label":       "Notícia",
    "labelPlural": "Notícias",
    "icon":        "Newspaper",

    "db": {
        "readView":  "vbl_site_noticia",
        "writeView": "vbf_site_noticia",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",               "label": "ID",             "type": "id"},
        {"key": "titulo",           "label": "Título",          "type": "text",     "required": True},
        {"key": "resumo",           "label": "Resumo",          "type": "textarea"},
        {"key": "categoria",        "label": "Categoria",       "type": "text",     "readonly": True},
        {"key": "ts_categoria",     "label": "Categoria (ID)",  "type": "number"},
        {"key": "estado",           "label": "Estado",          "type": "text",     "readonly": True},
        {"key": "ts_estado",        "label": "Estado (ID)",     "type": "number"},
        {"key": "destaque",         "label": "Destaque",        "type": "boolean"},
        {"key": "data_publicacao",  "label": "Data Publicação", "type": "date"},
        {"key": "imagem_url",       "label": "Imagem URL",      "type": "text"},
        {"key": "conteudo_html",    "label": "Conteúdo HTML",   "type": "textarea"},
    ],

    "listView": {
        "columns":     ["titulo", "categoria", "estado", "destaque", "data_publicacao"],
        "defaultSort": {"field": "data_publicacao", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Notícia",    "fields": ["titulo", "ts_categoria", "ts_estado", "destaque", "data_publicacao"], "cols": 2},
            {"title": "Resumo",     "fields": ["resumo"],                                                              "cols": 1},
            {"title": "Conteúdo",   "fields": ["conteudo_html"],                                                       "cols": 1},
        ],
    },
}
