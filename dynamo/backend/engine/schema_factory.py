"""
Devolve o schema de uma entidade como JSON (para debug + frontend discovery).
"""


def entity_to_schema(entity_cfg: dict) -> dict:
    return {
        "key":         entity_cfg["key"],
        "label":       entity_cfg.get("label", entity_cfg["key"]),
        "labelPlural": entity_cfg.get("labelPlural", entity_cfg.get("label", entity_cfg["key"])),
        "icon":        entity_cfg.get("icon"),
        "db":          entity_cfg["db"],
        "permissions": entity_cfg.get("permissions", {}),
        "fields":      entity_cfg.get("fields", []),
        "relations":   entity_cfg.get("relations", {}),
        "listView":    entity_cfg.get("listView", {}),
        "formView":    entity_cfg.get("formView", {}),
        "detailView":  entity_cfg.get("detailView", {}),
    }
