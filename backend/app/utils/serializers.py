from app.utils.logger import get_logger

logger = get_logger(__name__)


# utils/serializers.py
def model_to_dict(model):
    """Converte modelo SQLAlchemy em dicionário serializável"""
    if model is None:
        return None

    result = {}
    for column in model.__table__.columns:
        result[column.name] = getattr(model, column.name)
    return result


def serialize_rows(rows) -> list:
    """Converte date/datetime/time para ISO antes do jsonify — o serializador
    por omissão do Flask usa http_date() (formato GMT) em datetimes "naive",
    o que desloca a hora exibida no browser (ex: 10:03 local passa a 11:03)."""
    out = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if hasattr(v, 'isoformat'):
                d[k] = v.isoformat()
        out.append(d)
    return out
