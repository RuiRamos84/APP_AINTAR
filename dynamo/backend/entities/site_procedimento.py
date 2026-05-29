ENTITY = {
    "key":         "site_procedimento",
    "label":       "Procedimento (Site)",
    "labelPlural": "Procedimentos (Site)",
    "icon":        "ScrollText",

    "db": {
        "readView":  "vbl_site_procedimento",
        "writeView": "vbf_site_procedimento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",               "label": "ID",               "type": "id"},
        {"key": "referencia",       "label": "Referência",        "type": "text",   "required": True},
        {"key": "titulo",           "label": "Título",            "type": "text",   "required": True},
        {"key": "tipo",             "label": "Tipo",              "type": "text",   "readonly": True},
        {"key": "carreira",         "label": "Carreira",          "type": "text"},
        {"key": "categoria_prof",   "label": "Categoria Prof.",   "type": "text"},
        {"key": "area_atividade",   "label": "Área Atividade",    "type": "text"},
        {"key": "num_vagas",        "label": "Nº Vagas",          "type": "number"},
        {"key": "municipio",        "label": "Município",         "type": "text"},
        {"key": "estado",           "label": "Estado",            "type": "text",   "readonly": True},
        {"key": "data_abertura",    "label": "Data Abertura",     "type": "date"},
        {"key": "data_encerramento","label": "Data Encerramento", "type": "date"},
        {"key": "visivel",          "label": "Visível",           "type": "boolean"},
        {"key": "descricao",        "label": "Descrição",         "type": "textarea"},
    ],

    "listView": {
        "columns":     ["referencia", "titulo", "carreira", "estado", "data_abertura", "data_encerramento"],
        "defaultSort": {"field": "data_abertura", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Procedimento", "fields": ["referencia", "titulo", "ts_tipo", "ts_estado", "visivel"],            "cols": 2},
            {"title": "Detalhe",      "fields": ["carreira", "categoria_prof", "area_atividade", "num_vagas", "municipio"], "cols": 2},
            {"title": "Datas",        "fields": ["data_abertura", "data_encerramento"],                                  "cols": 2},
            {"title": "Descrição",    "fields": ["descricao"],                                                           "cols": 1},
        ],
    },
}
