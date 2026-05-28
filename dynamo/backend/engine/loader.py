"""
Carrega e valida os configs de entidade do app_config.py.
Devolve um dicionário indexado por entity key.
"""
from typing import Any


VALID_FIELD_TYPES = {"id", "text", "textarea", "number", "boolean", "date", "datetime", "select", "relation"}
VALID_RELATION_TYPES = {"hasMany", "belongsTo"}


def validate_entity(cfg: dict) -> None:
    required = ("key", "label", "db", "fields")
    for r in required:
        if r not in cfg:
            raise ValueError(f"Entidade '{cfg.get('key', '?')}': campo obrigatório '{r}' em falta")

    db = cfg["db"]
    if "readView" not in db or "pkField" not in db:
        raise ValueError(f"Entidade '{cfg['key']}': db.readView e db.pkField são obrigatórios")

    for f in cfg["fields"]:
        if f.get("type") not in VALID_FIELD_TYPES:
            raise ValueError(f"Entidade '{cfg['key']}': tipo de campo inválido '{f.get('type')}' em '{f.get('key')}'")
        if f.get("type") == "relation" and "relation" not in f:
            raise ValueError(f"Entidade '{cfg['key']}': campo relation '{f['key']}' precisa de 'relation' config")

    for rel_key, rel in cfg.get("relations", {}).items():
        if rel.get("type") not in VALID_RELATION_TYPES:
            raise ValueError(f"Entidade '{cfg['key']}': relação '{rel_key}' tipo inválido")


def load_entities(app_config: dict) -> dict[str, Any]:
    entities = {}
    for key, cfg in app_config.get("entities", {}).items():
        validate_entity(cfg)
        entities[cfg["key"]] = cfg
    return entities


def get_text_fields(entity_cfg: dict) -> list[str]:
    """Campos pesquisáveis (tipo text/textarea)."""
    return [f["key"] for f in entity_cfg["fields"] if f.get("type") in ("text", "textarea")]


def get_writable_fields(entity_cfg: dict) -> list[str]:
    """Campos que podem ser escritos (excluindo id e readonly)."""
    return [
        f["key"] for f in entity_cfg["fields"]
        if f.get("type") != "id" and not f.get("readonly", False)
    ]
