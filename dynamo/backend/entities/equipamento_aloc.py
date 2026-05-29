ENTITY = {
    "key":         "equipamento_aloc",
    "label":       "Alocação de Equipamento",
    "labelPlural": "Alocações de Equipamentos",
    "icon":        "Wrench",

    "db": {
        "readView":  "vbl_equipamento_aloc",
        "writeView": "vbf_equipamento_aloc",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",                     "label": "ID",          "type": "id"},
        {
            "key":   "tb_equipamento",
            "label": "Equipamento",
            "type":  "relation",
            "relation": {"type": "belongsTo", "entity": "equipamento", "displayField": "marca"},
        },
        {"key": "tb_instalacao",          "label": "Instalação",  "type": "text", "readonly": True},
        {"key": "tt_equipamento$aloc",    "label": "Tipo Aloc.",  "type": "select", "meta": "equipamentoaloc"},
        {"key": "tt_equipamento$localizacao", "label": "Localização", "type": "select", "meta": "equipamentolocalizacao"},
        {"key": "start_date",             "label": "Data Início", "type": "date"},
        {"key": "stop_date",              "label": "Data Fim",    "type": "date"},
        {"key": "memo",                   "label": "Notas",       "type": "textarea"},
    ],

    "listView": {
        "columns":     ["tb_equipamento", "tb_instalacao", "tt_equipamento$aloc", "start_date", "stop_date"],
        "defaultSort": {"field": "pk", "dir": "desc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Alocação",
                "fields": ["tb_equipamento", "tt_equipamento$aloc", "tt_equipamento$localizacao"],
                "cols":   3,
            },
            {
                "title":  "Período",
                "fields": ["start_date", "stop_date", "memo"],
                "cols":   3,
            },
        ],
    },
}
