ENTITY = {
    "key":         "task",
    "label":       "Tarefa",
    "labelPlural": "Tarefas",
    "icon":        "CheckSquare",

    "db": {
        "readView":  "vbl_task",
        "writeView": "tb_task",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",              "label": "ID",          "type": "id"},
        {"key": "name",            "label": "Nome",         "type": "text",   "required": True},
        {"key": "ts_client_name",  "label": "Atribuído a",  "type": "text",   "readonly": True},
        {"key": "owner_name",      "label": "Criado por",   "type": "text",   "readonly": True},
        {"key": "ts_priority",     "label": "Prioridade",   "type": "select", "meta": "priority"},
        {"key": "ts_notestatus",   "label": "Estado",       "type": "select", "meta": "notestatus"},
        {"key": "when_start",      "label": "Início",       "type": "date"},
        {"key": "when_stop",       "label": "Prazo",        "type": "date"},
        {"key": "memo",            "label": "Descrição",    "type": "textarea"},
    ],

    "listView": {
        "columns":     ["name", "ts_client_name", "ts_priority", "ts_notestatus", "when_stop"],
        "defaultSort": {"field": "when_stop", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {
                "title":  "Tarefa",
                "fields": ["name", "ts_priority", "ts_notestatus"],
                "cols":   3,
            },
            {
                "title":  "Datas",
                "fields": ["when_start", "when_stop"],
                "cols":   2,
            },
            {
                "title":  "Descrição",
                "fields": ["memo"],
                "cols":   1,
            },
        ],
    },
}
