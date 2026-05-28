ENTITY = {
    "key":         "whatsapp_config",
    "label":       "Grupo WhatsApp",
    "labelPlural": "Grupos WhatsApp",
    "icon":        "MessageCircle",

    "db": {
        "readView":  "vbl_whatsapp_config",
        "writeView": "vbf_whatsapp_config",
        "pkField":   "pk",
    },

    "permissions": {
        "view": "operation.access",
        "edit": "operation.manage",
    },

    "fields": [
        {"key": "pk",           "label": "ID",              "type": "id"},
        {"key": "group_name",   "label": "Nome Grupo",       "type": "text",   "required": True},
        {"key": "group_id",     "label": "ID Grupo",         "type": "text",   "required": True},
        {"key": "invite_link",  "label": "Link Convite",     "type": "text"},
        {"key": "ativo",        "label": "Ativo",            "type": "boolean"},
        {"key": "estado",       "label": "Estado",           "type": "text",   "readonly": True},
        {"key": "dias_configurado","label": "Dias Config.", "type": "number", "readonly": True},
    ],

    "listView": {
        "columns":     ["group_name", "group_id", "ativo", "estado", "dias_configurado"],
        "defaultSort": {"field": "group_name", "dir": "asc"},
        "searchable":  True,
    },

    "formView": {
        "sections": [
            {"title": "Grupo", "fields": ["group_name", "group_id", "invite_link", "ativo"], "cols": 2},
        ],
    },
}
