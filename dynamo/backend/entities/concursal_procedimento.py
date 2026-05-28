ENTITY = {
    "key":         "concursal_procedimento",
    "label":       "Procedimento Concursal",
    "labelPlural": "Procedimentos Concursais",
    "icon":        "ClipboardCheck",

    "db": {
        "readView":  "vbl_concursal_procedimento",
        "writeView": "vbf_concursal_procedimento",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                    "label": "ID",              "type": "id"},
        {"key": "codigo_bep",            "label": "Código BEP",      "type": "text"},
        {"key": "carreira",              "label": "Carreira",         "type": "text"},
        {"key": "categoria",             "label": "Categoria",        "type": "text"},
        {"key": "area_atividade",        "label": "Área Atividade",   "type": "text"},
        {"key": "tipo_contrato_descricao","label": "Tipo Contrato",   "type": "text",   "readonly": True},
        {"key": "empregador",            "label": "Empregador",       "type": "text"},
        {"key": "data_abertura",         "label": "Data Abertura",    "type": "date",   "required": True},
        {"key": "data_encerramento",     "label": "Data Encerramento","type": "date"},
        {"key": "ativo",                 "label": "Ativo",            "type": "boolean"},
        {"key": "total_candidaturas",    "label": "Candidaturas",     "type": "number", "readonly": True},
        {"key": "memo",                  "label": "Observações",      "type": "textarea"},
    ],

    "listView": {
        "columns":     ["codigo_bep", "carreira", "categoria", "data_abertura", "data_encerramento", "ativo", "total_candidaturas"],
        "defaultSort": {"field": "data_abertura", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Identificação",  "fields": ["codigo_bep", "carreira", "categoria", "area_atividade"], "cols": 2},
            {"title": "Contrato",       "fields": ["empregador", "tt_tipo_contrato"], "cols": 2},
            {"title": "Datas",          "fields": ["data_abertura", "data_encerramento", "ativo"],           "cols": 3},
            {"title": "Observações",    "fields": ["memo"],                                                   "cols": 1},
        ],
    },

    "relations": {
        "candidaturas": {
            "type":       "hasMany",
            "entity":     "concursal_candidatura",
            "foreignKey": "tb_procedimento",
            "label":      "Candidaturas",
            "icon":       "UserPlus",
        },
    },

    "detailView": {
        "tabs": [
            {"label": "Candidaturas", "relation": "candidaturas", "icon": "UserPlus"},
        ],
    },
}
