ENTITY = {
    "key":         "obra",
    "label":       "Obra",
    "labelPlural": "Obras",
    "icon":        "HardHat",

    "db": {
        "readView":  "vbl_obra",
        "writeView": "vbf_obra",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                   "label": "ID",               "type": "id"},
        {"key": "nome",                 "label": "Designação",        "type": "text",   "required": True},
        {"key": "tt_tipoobra",          "label": "Tipo de Obra",      "type": "select", "meta": "tipoobra"},
        {"key": "tb_instalacao",        "label": "Instalação",        "type": "text",   "readonly": True},
        {"key": "data_prevista",        "label": "Data Prevista",     "type": "date"},
        {"key": "data_obra_inicio",     "label": "Início Obra",       "type": "date"},
        {"key": "data_obra_fim",        "label": "Fim Obra",          "type": "date"},
        {"key": "valor_estimado",       "label": "Valor Estimado (€)","type": "number"},
        {"key": "valor_exec_aintar",    "label": "Exec. AINTAR (€)",  "type": "number"},
        {"key": "valor_exec_subsidio",  "label": "Exec. Subsídio (€)","type": "number"},
        {"key": "valor_exec_municipio", "label": "Exec. Município (€)","type": "number"},
        {"key": "tt_urgencia",          "label": "Urgência",          "type": "select", "meta": "urgencia"},
        {"key": "aviso",                "label": "Aviso",             "type": "text"},
        {"key": "memo",                 "label": "Notas",             "type": "textarea"},
    ],

    "listView": {
        "columns":     ["nome", "tt_tipoobra", "tb_instalacao", "data_prevista", "valor_estimado", "estado"],
        "defaultSort": {"field": "pk", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Identificação",
                "fields": ["nome", "tt_tipoobra", "tb_instalacao", "tt_urgencia"],
                "cols":   2,
            },
            {
                "title":  "Calendário",
                "fields": ["data_prevista", "data_obra_inicio", "data_obra_fim"],
                "cols":   3,
            },
            {
                "title":  "Valores (€)",
                "fields": ["valor_estimado", "valor_exec_aintar", "valor_exec_subsidio", "valor_exec_municipio"],
                "cols":   2,
            },
            {
                "title":  "Notas",
                "fields": ["aviso", "memo"],
                "cols":   1,
            },
        ],
    },
}
