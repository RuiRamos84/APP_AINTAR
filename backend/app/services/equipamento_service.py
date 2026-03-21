from sqlalchemy.sql import text
from datetime import datetime
import os
from flask import current_app
from werkzeug.utils import secure_filename
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'}


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _save_file(file_obj, subfolder='equipamento'):
    """Guarda um ficheiro em uploads/<subfolder>/ e devolve o path relativo."""
    if not file_obj or not file_obj.filename:
        return None
    if not _allowed_file(file_obj.filename):
        return None
    upload_dir = os.path.join(current_app.root_path, 'uploads', subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    filename = secure_filename(file_obj.filename)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
    unique_name = f"{timestamp}_{filename}"
    full_path = os.path.join(upload_dir, unique_name)
    file_obj.save(full_path)
    return f"uploads/{subfolder}/{unique_name}"


@api_error_handler
def list_equipamentos(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbf_instalacao_equipamento ORDER BY pk DESC")
        result = session.execute(query).mappings().all()
        rows = []
        for row in result:
            d = dict(row)
            if isinstance(d.get('start_date'), datetime):
                d['start_date'] = d['start_date'].isoformat()
            rows.append(d)
        return {'equipamentos': rows}, 200


@api_error_handler
def list_equipamentos_by_instalacao(current_user: str, tb_instalacao: int):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbf_instalacao_equipamento WHERE tb_instalacao = :pk ORDER BY pk DESC"
        )
        result = session.execute(query, {'pk': tb_instalacao}).mappings().all()
        rows = []
        for row in result:
            d = dict(row)
            if isinstance(d.get('start_date'), datetime):
                d['start_date'] = d['start_date'].isoformat()
            rows.append(d)
        return {'equipamentos': rows}, 200


@api_error_handler
def create_equipamento(current_user: str, data: dict, files: dict):
    with db_session_manager(current_user) as session:
        pk_res = session.execute(text("SELECT fs_nextcode()")).scalar()

        tb_instalacao = data.get('tb_instalacao')
        tt_equiptipo = data.get('tt_equiptipo')
        tt_equiplocalizacao = data.get('tt_equiplocalizacao')
        marca = data.get('marca') or None
        modelo = data.get('modelo') or None
        serial = data.get('serial') or None
        start_date = data.get('start_date') or None

        if start_date and isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)

        file_manual = _save_file(files.get('file_manual'))
        file_specs = _save_file(files.get('file_specs'))
        file_esquemas = _save_file(files.get('file_esquemas'))

        query = text("""
            INSERT INTO vbf_instalacao_equipamento
            (pk, tb_instalacao, tt_equiptipo, tt_equiplocalizacao,
             marca, modelo, serial, start_date, file_manual, file_specs, file_esquemas)
            VALUES
            (:pk, :tb_instalacao, :tt_equiptipo, :tt_equiplocalizacao,
             :marca, :modelo, :serial, :start_date, :file_manual, :file_specs, :file_esquemas)
        """)
        session.execute(query, {
            'pk': pk_res,
            'tb_instalacao': tb_instalacao,
            'tt_equiptipo': tt_equiptipo,
            'tt_equiplocalizacao': tt_equiplocalizacao,
            'marca': marca,
            'modelo': modelo,
            'serial': serial,
            'start_date': start_date,
            'file_manual': file_manual,
            'file_specs': file_specs,
            'file_esquemas': file_esquemas,
        })
        session.commit()

    return {'message': 'Equipamento registado com sucesso', 'pk': pk_res}, 201


@api_error_handler
def update_equipamento(current_user: str, pk: int, data: dict, files: dict):
    allowed = [
        'tb_instalacao', 'tt_equiptipo', 'tt_equiplocalizacao',
        'marca', 'modelo', 'serial', 'start_date',
    ]
    update_fields = {k: v for k, v in data.items() if k in allowed}

    if 'start_date' in update_fields and isinstance(update_fields['start_date'], str):
        update_fields['start_date'] = datetime.fromisoformat(update_fields['start_date']) if update_fields['start_date'] else None

    for file_field in ('file_manual', 'file_specs', 'file_esquemas'):
        path = _save_file(files.get(file_field))
        if path:
            update_fields[file_field] = path

    if not update_fields:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    set_clause = ', '.join(f"{k} = :{k}" for k in update_fields)
    update_fields['pk'] = pk

    with db_session_manager(current_user) as session:
        result = session.execute(
            text(f"UPDATE vbf_instalacao_equipamento SET {set_clause} WHERE pk = :pk"),
            update_fields,
        )
        session.commit()

    if result.rowcount == 0:
        return {'message': f'Registo {pk} não encontrado'}, 404

    return {'message': 'Equipamento atualizado com sucesso'}, 200


@api_error_handler
def delete_equipamento(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("DELETE FROM vbf_instalacao_equipamento WHERE pk = :pk"),
            {'pk': pk},
        )
        session.commit()

    if result.rowcount == 0:
        return {'message': f'Registo {pk} não encontrado'}, 404

    return {'message': 'Equipamento eliminado com sucesso'}, 200
