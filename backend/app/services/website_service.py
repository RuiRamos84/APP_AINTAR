import os
import re
import uuid
import unicodedata
from datetime import datetime
from flask import current_app
from sqlalchemy.sql import text
from pydantic import BaseModel, field_validator
from typing import Optional

from ..utils.utils import db_session_manager, send_mail
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    """Converte texto em nome de ficheiro seguro (sem acentos, espaços → hífenes)."""
    if not text:
        return 'sem-titulo'
    text = str(text).strip().lower()
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def _serialize(row) -> dict:
    """Converte tipos não serializáveis (datetime, date) para string."""
    result = dict(row)
    for k, v in result.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif hasattr(v, 'isoformat'):
            result[k] = v.isoformat()
    return result


def _save_website_file(file, tipo: str, pk: int) -> str:
    """
    Guarda um ficheiro em FILES_DIR/website/<tipo>/ e retorna o nome do ficheiro.
    O nome é <pk>_<uuid><ext> para evitar colisões.
    """
    base = current_app.config['FILES_DIR']
    folder = os.path.join(base, 'website', tipo)
    os.makedirs(folder, exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    filename = f"{pk}_{uuid.uuid4().hex[:8]}{ext}"
    file.save(os.path.join(folder, filename))
    return filename


def _delete_website_file(tipo: str, filename: str):
    """Remove um ficheiro do disco se existir."""
    if not filename:
        return
    base = current_app.config['FILES_DIR']
    path = os.path.join(base, 'website', tipo, filename)
    if os.path.exists(path):
        os.remove(path)


def _file_url(tipo: str, filename: str) -> Optional[str]:
    if not filename:
        return None
    return f"/api/v1/website/files/{tipo}/{filename}"


# ─── PÚBLICA — Órgãos Sociais ────────────────────────────────────────────────

@api_error_handler
def get_orgaos_sociais():
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'orgaos_sociais.json')
    with open(os.path.abspath(data_path), encoding='utf-8') as f:
        import json
        return json.load(f), 200


# ─── PÚBLICA — Alertas ───────────────────────────────────────────────────────

@api_error_handler
def list_alertas_active():
    """Alertas ativos para o banner do website público."""
    from app import db
    rows = db.session.execute(text("""
        SELECT pk, mensagem, tipo, data_inicio, data_fim
        FROM vbl_site_alerta
        WHERE ativo_agora = TRUE
        ORDER BY pk DESC
    """)).mappings().all()
    return {'alertas': [_serialize(r) for r in rows]}, 200


# ─── PÚBLICA — Notícias ──────────────────────────────────────────────────────

@api_error_handler
def list_noticias_public(page=1, per_page=9, destaque_only=False):
    from app import db
    offset = (page - 1) * per_page
    extra = "AND destaque = TRUE" if destaque_only else ""
    rows = db.session.execute(text(f"""
        SELECT pk, titulo, resumo, ts_categoria, categoria,
               imagem_url, destaque, data_publicacao, data_criacao
        FROM vbl_site_noticia
        WHERE ts_estado = 2 {extra}
        ORDER BY COALESCE(data_publicacao, data_criacao) DESC NULLS LAST
        LIMIT :lim OFFSET :off
    """), {'lim': per_page, 'off': offset}).mappings().all()

    total = db.session.execute(text(f"""
        SELECT COUNT(*) FROM vbl_site_noticia WHERE ts_estado = 2 {extra}
    """)).scalar()

    result = []
    for r in rows:
        item = _serialize(r)
        item['imagem_url'] = _file_url('noticias', item.get('imagem_url'))
        result.append(item)

    return {'noticias': result, 'total': total, 'page': page, 'per_page': per_page}, 200


@api_error_handler
def get_noticia_public(pk: int):
    from app import db
    row = db.session.execute(text("""
        SELECT pk, titulo, resumo, conteudo_html, ts_categoria, categoria,
               imagem_url, destaque, data_publicacao, data_criacao
        FROM vbl_site_noticia
        WHERE pk = :pk AND ts_estado = 2
    """), {'pk': pk}).mappings().fetchone()

    if not row:
        raise ResourceNotFoundError('Notícia', pk)

    item = _serialize(row)
    item['imagem_url'] = _file_url('noticias', item.get('imagem_url'))

    imgs = db.session.execute(text("""
        SELECT pk, imagem_url, ordem, legenda
        FROM tb_site_noticia_imagem
        WHERE noticia_fk = :pk
        ORDER BY ordem ASC
    """), {'pk': pk}).mappings().all()

    item['imagens'] = [
        {
            'pk': i['pk'],
            'url': _file_url('noticias', i['imagem_url']),
            'ordem': i['ordem'],
            'legenda': i['legenda'],
        }
        for i in imgs
    ]

    return {'noticia': item}, 200


# ─── PÚBLICA — Documentos ────────────────────────────────────────────────────

@api_error_handler
def list_documentos_public(categoria_pk: int = None):
    from app import db
    where = "WHERE d.ativo = TRUE"
    params = {}
    if categoria_pk:
        where += " AND d.ts_categoria = :cat"
        params['cat'] = categoria_pk

    rows = db.session.execute(text(f"""
        SELECT pk, titulo, descricao, ts_categoria, categoria,
               subcategoria, ano, ficheiro_url, ordem
        FROM vbl_site_documento d
        {where}
        ORDER BY ts_categoria, ordem, ano DESC NULLS LAST, titulo
    """), params).mappings().all()

    result = []
    for r in rows:
        item = _serialize(r)
        item['ficheiro_url'] = _file_url('documentos', item.get('ficheiro_url'))
        result.append(item)

    return {'documentos': result}, 200


# ─── PÚBLICA — Publicações (Editais) ─────────────────────────────────────────

@api_error_handler
def list_publicacoes_public(tipo_pk: int = None):
    from app import db
    where = "WHERE p.ativo = TRUE"
    params = {}
    if tipo_pk:
        where += " AND p.ts_tipo = :tipo"
        params['tipo'] = tipo_pk

    rows = db.session.execute(text(f"""
        SELECT pk, titulo, tipo, subtipo, numero, ano,
               data_publicacao, referencia_dr, ficheiro_url, e_retificacao
        FROM vbl_site_publicacao p
        {where}
        ORDER BY data_publicacao DESC NULLS LAST
    """), params).mappings().all()

    result = []
    for r in rows:
        item = _serialize(r)
        item['ficheiro_url'] = _file_url('publicacoes', item.get('ficheiro_url'))
        result.append(item)

    return {'publicacoes': result}, 200


# ─── PÚBLICA — Procedimentos RH ──────────────────────────────────────────────

@api_error_handler
def list_procedimentos_public():
    from app import db
    rows = db.session.execute(text("""
        SELECT pk, referencia, tipo, titulo, carreira, categoria_prof,
               num_vagas, municipio, estado, data_abertura,
               data_encerramento, ultima_fase_data, ultima_fase_nome
        FROM vbl_site_procedimento
        WHERE visivel = TRUE
        ORDER BY data_abertura DESC NULLS LAST
    """)).mappings().all()

    return {'procedimentos': [_serialize(r) for r in rows]}, 200


@api_error_handler
def get_procedimento_public(pk: int):
    from app import db
    proc = db.session.execute(text("""
        SELECT pk, referencia, tipo, titulo, carreira, categoria_prof,
               num_vagas, municipio, estado, descricao,
               data_abertura, data_encerramento
        FROM vbl_site_procedimento
        WHERE pk = :pk AND visivel = TRUE
    """), {'pk': pk}).mappings().fetchone()

    if not proc:
        raise ResourceNotFoundError('Procedimento', pk)

    fases = db.session.execute(text("""
        SELECT pk, ts_tipo_fase, label, data, ficheiro_url, notas, ordem
        FROM vbl_site_procedimento_fase
        WHERE procedimento_fk = :pk AND publicado = TRUE
        ORDER BY ordem
    """), {'pk': pk}).mappings().all()

    result = _serialize(proc)
    result['fases'] = []
    for f in fases:
        item = _serialize(f)
        item['ficheiro_url'] = _file_url('procedimentos', item.get('ficheiro_url'))
        result['fases'].append(item)

    return {'procedimento': result}, 200


# ─── PÚBLICA — Processos Financeiros ─────────────────────────────────────────

@api_error_handler
def list_processos_financeiros_public():
    from app import db
    processos = db.session.execute(text("""
        SELECT pk, tipo, ano_exercicio, titulo, estado,
               num_documentos, num_publicados, tem_provisorios
        FROM vbl_site_processo_financeiro
        WHERE visivel = TRUE
        ORDER BY ano_exercicio DESC, ts_tipo
    """)).mappings().all()

    result = []
    for p in processos:
        item = _serialize(p)
        docs = db.session.execute(text("""
            SELECT pk, tipo_doc, titulo, provisorio, ficheiro_url,
                   data_publicacao, ordem
            FROM vbl_site_processo_financeiro_doc
            WHERE processo_fk = :pk AND publicado = TRUE
            ORDER BY ordem
        """), {'pk': p['pk']}).mappings().all()
        item['documentos'] = []
        for d in docs:
            ditem = _serialize(d)
            ditem['ficheiro_url'] = _file_url('financeiros', ditem.get('ficheiro_url'))
            item['documentos'].append(ditem)
        result.append(item)

    return {'processos': result}, 200


# ─── PÚBLICA — Formulário de Contacto ────────────────────────────────────────

@api_error_handler
def send_contacto(name: str, email: str, subject: str, message: str):
    body = (
        f"Nova mensagem recebida através do website aintar.pt\n"
        f"{'─' * 50}\n"
        f"Nome:    {name}\n"
        f"Email:   {email}\n"
        f"Assunto: {subject}\n"
        f"{'─' * 50}\n\n"
        f"{message}"
    )
    send_mail(
        subject=f"[Website] {subject}",
        body=body,
        recipient="geral@aintar.pt",
        sender_email="geral@aintar.pt",
    )
    logger.info(f"Contacto do website enviado por {email}")
    return {'message': 'Mensagem enviada com sucesso'}, 200


# ─── CMS — Metadados (lookups) ────────────────────────────────────────────────

@api_error_handler
def get_metadados(current_user: str):
    with db_session_manager(current_user) as session:
        def _lookup(table):
            return [dict(r) for r in session.execute(
                text(f"SELECT pk, name FROM {table} ORDER BY pk")
            ).mappings().all()]

        return {
            'noticia_estados':              _lookup('ts_site_noticia_estado'),
            'noticia_categorias':           _lookup('ts_site_noticia_categoria'),
            'publicacao_tipos':             _lookup('ts_site_publicacao_tipo'),
            'publicacao_subtipos':          _lookup('ts_site_publicacao_subtipo'),
            'documento_categorias':         _lookup('ts_site_documento_categoria'),
            'procedimento_tipos':           _lookup('ts_site_procedimento_tipo'),
            'procedimento_estados':         _lookup('ts_site_procedimento_estado'),
            'procedimento_fase_tipos':      _lookup('ts_site_procedimento_fase_tipo'),
            'processo_financeiro_tipos':    _lookup('ts_site_processo_financeiro_tipo'),
            'processo_financeiro_estados':  _lookup('ts_site_processo_financeiro_estado'),
            'processo_financeiro_doc_tipos':_lookup('ts_site_processo_financeiro_doc_tipo'),
            'alerta_tipos':                 _lookup('ts_site_alerta_tipo'),
        }, 200


# ─── CMS — Notícias ───────────────────────────────────────────────────────────

@api_error_handler
def cms_list_noticias(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, titulo, ts_categoria, categoria, ts_estado, estado,
                   destaque, imagem_url, data_publicacao, data_criacao
            FROM vbl_site_noticia
            ORDER BY COALESCE(data_publicacao, data_criacao) DESC NULLS LAST
        """)).mappings().all()
        return {'noticias': [_serialize(r) for r in rows]}, 200


@api_error_handler
def cms_get_noticia(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT pk, titulo, resumo, conteudo_html, ts_categoria, categoria,
                   imagem_url, destaque, ts_estado, estado, data_publicacao
            FROM vbl_site_noticia WHERE pk = :pk
        """), {'pk': pk}).mappings().fetchone()
        if not row:
            raise ResourceNotFoundError('Notícia', pk)
        item = _serialize(row)
        item['imagem_url_display'] = _file_url('noticias', item.get('imagem_url'))
        return {'noticia': item}, 200


@api_error_handler
def cms_save_noticia(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        user_pk = session.execute(text("SELECT fs_client()")).scalar()

        data_pub = data.get('data_publicacao')
        if data_pub and isinstance(data_pub, str):
            try:
                data_pub = datetime.fromisoformat(data_pub)
            except Exception:
                data_pub = None
        # A função fbf_site_noticia aceita TIMESTAMP (sem timezone).
        # Se o datetime tiver timezone, removemos para evitar erro de tipo.
        if data_pub and hasattr(data_pub, 'tzinfo') and data_pub.tzinfo is not None:
            data_pub = data_pub.replace(tzinfo=None)

        session.execute(text("""
            SELECT fbf_site_noticia(
                CAST(:pop AS SMALLINT), :pk, :titulo, :resumo, :conteudo,
                CAST(:categoria AS SMALLINT), :imagem_url, :destaque, CAST(:estado AS SMALLINT),
                :data_pub, :criado_por
            )
        """), {
            'pop': pop, 'pk': pk,
            'titulo':     data.get('titulo'),
            'resumo':     data.get('resumo'),
            'conteudo':   data.get('conteudo_html'),
            'categoria':  data.get('ts_categoria'),
            'imagem_url': data.get('imagem_url'),
            'destaque':   data.get('destaque', False),
            'estado':     data.get('ts_estado', 1),
            'data_pub':   data_pub,
            'criado_por': user_pk,
        })
        action = 'criada' if pop == 0 else 'atualizada'
        logger.info(f"Notícia {pk} {action} por {current_user}")
        return {'pk': pk, 'message': f'Notícia {action} com sucesso'}, 200


@api_error_handler
def cms_delete_noticia(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT imagem_url FROM tb_site_noticia WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not row:
            raise ResourceNotFoundError('Notícia', pk)

        # Delete all gallery image files before removing DB rows
        gallery = session.execute(
            text("SELECT imagem_url FROM tb_site_noticia_imagem WHERE noticia_fk = :pk"),
            {'pk': pk}
        ).fetchall()
        for img in gallery:
            _delete_website_file('noticias', img[0])

        _delete_website_file('noticias', row[0])
        session.execute(text("DELETE FROM tb_site_noticia WHERE pk = :pk"), {'pk': pk})
        logger.info(f"Notícia {pk} eliminada por {current_user}")
        return {'message': 'Notícia eliminada'}, 200


@api_error_handler
def cms_upload_noticia_imagem(pk: int, file, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text(
            "SELECT titulo, data_publicacao, imagem_url FROM vbl_site_noticia WHERE pk = :pk"
        ), {'pk': pk}).mappings().fetchone()
        if not row:
            raise ResourceNotFoundError('Notícia', pk)

        _delete_website_file('noticias', row['imagem_url'])

        ano    = str(row['data_publicacao'].year) if row['data_publicacao'] else str(datetime.now().year)
        titulo = _slugify(row['titulo'] or f'noticia-{pk}')
        ext    = os.path.splitext(file.filename)[1].lower() if file.filename else '.jpg'

        folder = os.path.join(current_app.config['FILES_DIR'], 'website', 'noticias', ano)
        os.makedirs(folder, exist_ok=True)

        filename = f"{titulo}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            filename = f"{titulo}-{pk}{ext}"

        file.save(os.path.join(folder, filename))
        rel_path = f"{ano}/{filename}"

        session.execute(
            text("UPDATE vbf_site_noticia SET imagem_url = :f WHERE pk = :pk"),
            {'f': rel_path, 'pk': pk}
        )
        return {'imagem_url': _file_url('noticias', rel_path), 'filename': rel_path}, 200


def _sync_noticia_imagem_url(session, noticia_pk: int):
    """Sincroniza imagem_url da notícia com a 1ª imagem da galeria (menor ordem)."""
    row = session.execute(text("""
        SELECT imagem_url FROM tb_site_noticia_imagem
        WHERE noticia_fk = :pk
        ORDER BY ordem ASC
        LIMIT 1
    """), {'pk': noticia_pk}).fetchone()
    new_url = row[0] if row else None
    session.execute(
        text("UPDATE vbf_site_noticia SET imagem_url = :url WHERE pk = :pk"),
        {'url': new_url, 'pk': noticia_pk}
    )


@api_error_handler
def cms_get_noticia_imagens(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, imagem_url, ordem, legenda
            FROM tb_site_noticia_imagem
            WHERE noticia_fk = :pk
            ORDER BY ordem ASC
        """), {'pk': pk}).mappings().all()
        result = []
        for r in rows:
            item = dict(r)
            item['url'] = _file_url('noticias', item['imagem_url'])
            result.append(item)
        return {'imagens': result}, 200


@api_error_handler
def cms_upload_noticia_imagens(pk: int, files: list, current_user: str):
    with db_session_manager(current_user) as session:
        noticia = session.execute(
            text("SELECT pk FROM tb_site_noticia WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not noticia:
            raise ResourceNotFoundError('Notícia', pk)

        max_ordem = session.execute(text("""
            SELECT COALESCE(MAX(ordem), -1) FROM tb_site_noticia_imagem WHERE noticia_fk = :pk
        """), {'pk': pk}).scalar()

        uploaded = []
        saved_files = []
        try:
            for i, file in enumerate(files):
                img_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
                filename = _save_website_file(file, 'noticias', img_pk)
                saved_files.append(filename)
                ordem = max_ordem + 1 + i
                session.execute(text("""
                    INSERT INTO tb_site_noticia_imagem (pk, noticia_fk, imagem_url, ordem)
                    VALUES (:pk, :noticia_fk, :imagem_url, :ordem)
                """), {'pk': img_pk, 'noticia_fk': pk, 'imagem_url': filename, 'ordem': ordem})
                uploaded.append({'pk': img_pk, 'url': _file_url('noticias', filename), 'ordem': ordem, 'legenda': None})
        except Exception:
            for fname in saved_files:
                _delete_website_file('noticias', fname)
            raise

        _sync_noticia_imagem_url(session, pk)
        logger.info(f"{len(files)} imagem(ns) adicionada(s) à notícia {pk} por {current_user}")
        return {'imagens': uploaded}, 200


@api_error_handler
def cms_reorder_noticia_imagens(pk: int, ordem_list: list, current_user: str):
    with db_session_manager(current_user) as session:
        for item in ordem_list:
            session.execute(text("""
                UPDATE tb_site_noticia_imagem
                SET ordem = :ordem
                WHERE pk = :img_pk AND noticia_fk = :noticia_pk
            """), {'ordem': item['ordem'], 'img_pk': item['pk'], 'noticia_pk': pk})
        _sync_noticia_imagem_url(session, pk)
        return {'message': 'Ordem atualizada'}, 200


@api_error_handler
def cms_update_noticia_imagem_legenda(noticia_pk: int, img_pk: int, legenda: str, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT pk FROM tb_site_noticia_imagem
            WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'img_pk': img_pk, 'noticia_pk': noticia_pk}).fetchone()
        if not row:
            raise ResourceNotFoundError('Imagem', img_pk)
        session.execute(text("""
            UPDATE tb_site_noticia_imagem
            SET legenda = :legenda
            WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'legenda': legenda or None, 'img_pk': img_pk, 'noticia_pk': noticia_pk})
        return {'message': 'Legenda atualizada'}, 200


@api_error_handler
def cms_delete_noticia_imagem(noticia_pk: int, img_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT imagem_url FROM tb_site_noticia_imagem
            WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'img_pk': img_pk, 'noticia_pk': noticia_pk}).fetchone()
        if not row:
            raise ResourceNotFoundError('Imagem', img_pk)

        _delete_website_file('noticias', row[0])
        session.execute(text("""
            DELETE FROM tb_site_noticia_imagem WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'img_pk': img_pk, 'noticia_pk': noticia_pk})
        _sync_noticia_imagem_url(session, noticia_pk)
        logger.info(f"Imagem {img_pk} removida da notícia {noticia_pk} por {current_user}")
        return {'message': 'Imagem eliminada'}, 200


# ─── CMS — Alertas ───────────────────────────────────────────────────────────

@api_error_handler
def cms_list_alertas(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, mensagem, ts_tipo, tipo, ativo, ativo_agora,
                   data_inicio, data_fim
            FROM vbl_site_alerta
            ORDER BY ativo DESC, pk DESC
        """)).mappings().all()
        return {'alertas': [_serialize(r) for r in rows]}, 200


@api_error_handler
def cms_save_alerta(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        session.execute(text("""
            SELECT fbf_site_alerta(
                CAST(:pop AS SMALLINT), :pk, :mensagem, CAST(:ts_tipo AS SMALLINT), :ativo, :data_inicio, :data_fim
            )
        """), {
            'pop': pop, 'pk': pk,
            'mensagem':    data.get('mensagem'),
            'ts_tipo':     data.get('ts_tipo', 1),
            'ativo':       data.get('ativo', True),
            'data_inicio': data.get('data_inicio'),
            'data_fim':    data.get('data_fim'),
        })
        action = 'criado' if pop == 0 else 'atualizado'
        return {'pk': pk, 'message': f'Alerta {action} com sucesso'}, 200


@api_error_handler
def cms_delete_alerta(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        session.execute(text("DELETE FROM tb_site_alerta WHERE pk = :pk"), {'pk': pk})
        return {'message': 'Alerta eliminado'}, 200


# ─── CMS — Documentos ────────────────────────────────────────────────────────

@api_error_handler
def cms_list_documentos(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, titulo, ts_categoria, categoria, subcategoria,
                   ano, ficheiro_url, ordem, ativo, data_criacao
            FROM vbl_site_documento
            ORDER BY ts_categoria, ordem, titulo
        """)).mappings().all()
        result = []
        for r in rows:
            item = _serialize(r)
            item['ficheiro_url_display'] = _file_url('documentos', item.get('ficheiro_url'))
            result.append(item)
        return {'documentos': result}, 200


@api_error_handler
def cms_save_documento(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        user_pk = session.execute(text("SELECT fs_client()")).scalar()

        session.execute(text("""
            SELECT fbf_site_documento(
                CAST(:pop AS SMALLINT), :pk, :titulo, :descricao, CAST(:categoria AS SMALLINT),
                :subcategoria, CAST(:ano AS SMALLINT), :ficheiro_url, CAST(:ordem AS SMALLINT), :ativo, :criado_por
            )
        """), {
            'pop': pop, 'pk': pk,
            'titulo':      data.get('titulo'),
            'descricao':   data.get('descricao'),
            'categoria':   data.get('ts_categoria'),
            'subcategoria':data.get('subcategoria'),
            'ano':         data.get('ano'),
            'ficheiro_url':data.get('ficheiro_url'),
            'ordem':       data.get('ordem', 0),
            'ativo':       data.get('ativo', True),
            'criado_por':  user_pk,
        })
        action = 'criado' if pop == 0 else 'atualizado'
        return {'pk': pk, 'message': f'Documento {action} com sucesso'}, 200


@api_error_handler
def cms_delete_documento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT ficheiro_url FROM tb_site_documento WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not row:
            raise ResourceNotFoundError('Documento', pk)
        _delete_website_file('documentos', row[0])
        session.execute(text("DELETE FROM tb_site_documento WHERE pk = :pk"), {'pk': pk})
        return {'message': 'Documento eliminado'}, 200


@api_error_handler
def cms_upload_documento_file(pk: int, file, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT d.titulo, d.ano, d.ficheiro_url, c.name AS categoria_nome
            FROM tb_site_documento d
            LEFT JOIN ts_site_documento_categoria c ON c.pk = d.ts_categoria
            WHERE d.pk = :pk
        """), {'pk': pk}).mappings().fetchone()

        if not row:
            raise ResourceNotFoundError('Documento', pk)

        # Apagar ficheiro anterior
        _delete_website_file('documentos', row['ficheiro_url'])

        # Construir estrutura: documentos/<ano>/<categoria>/<titulo>.<ext>
        ano       = str(row['ano']) if row['ano'] else 'sem-ano'
        categoria = _slugify(row['categoria_nome'] or 'outros')
        titulo    = _slugify(row['titulo'] or f'documento-{pk}')
        ext       = os.path.splitext(file.filename)[1].lower() if file.filename else '.pdf'

        base   = current_app.config['FILES_DIR']
        folder = os.path.join(base, 'website', 'documentos', ano, categoria)
        os.makedirs(folder, exist_ok=True)

        # Garantir nome único se já existir ficheiro com o mesmo título
        filename = f"{titulo}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            filename = f"{titulo}-{pk}{ext}"

        file.save(os.path.join(folder, filename))

        rel_path = f"{ano}/{categoria}/{filename}"
        session.execute(
            text("UPDATE vbf_site_documento SET ficheiro_url = :f WHERE pk = :pk"),
            {'f': rel_path, 'pk': pk}
        )
        return {'ficheiro_url': _file_url('documentos', rel_path), 'filename': rel_path}, 200


# ─── CMS — Publicações ───────────────────────────────────────────────────────

@api_error_handler
def cms_list_publicacoes(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, titulo, ts_tipo, tipo, ts_subtipo, subtipo,
                   numero, ano, data_publicacao, referencia_dr,
                   ficheiro_url, e_retificacao, ativo
            FROM vbl_site_publicacao
            ORDER BY data_publicacao DESC NULLS LAST
        """)).mappings().all()
        result = []
        for r in rows:
            item = _serialize(r)
            item['ficheiro_url_display'] = _file_url('publicacoes', item.get('ficheiro_url'))
            result.append(item)
        return {'publicacoes': result}, 200


@api_error_handler
def cms_save_publicacao(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        user_pk = session.execute(text("SELECT fs_client()")).scalar()

        data_pub = data.get('data_publicacao')
        if data_pub and isinstance(data_pub, str):
            try:
                from datetime import date
                data_pub = date.fromisoformat(data_pub)
            except Exception:
                data_pub = None

        session.execute(text("""
            SELECT fbf_site_publicacao(
                CAST(:pop AS SMALLINT), :pk, :titulo, CAST(:ts_tipo AS SMALLINT), CAST(:ts_subtipo AS SMALLINT),
                :numero, CAST(:ano AS SMALLINT), :data_pub, :referencia_dr,
                :ficheiro_url, :e_retificacao, :publicacao_pai, :ativo, :criado_por
            )
        """), {
            'pop': pop, 'pk': pk,
            'titulo':        data.get('titulo'),
            'ts_tipo':       data.get('ts_tipo'),
            'ts_subtipo':    data.get('ts_subtipo'),
            'numero':        data.get('numero'),
            'ano':           data.get('ano'),
            'data_pub':      data_pub,
            'referencia_dr': data.get('referencia_dr'),
            'ficheiro_url':  data.get('ficheiro_url'),
            'e_retificacao': data.get('e_retificacao', False),
            'publicacao_pai':data.get('publicacao_pai'),
            'ativo':         data.get('ativo', True),
            'criado_por':    user_pk,
        })
        action = 'criada' if pop == 0 else 'atualizada'
        return {'pk': pk, 'message': f'Publicação {action} com sucesso'}, 200


@api_error_handler
def cms_delete_publicacao(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT ficheiro_url FROM tb_site_publicacao WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not row:
            raise ResourceNotFoundError('Publicação', pk)
        _delete_website_file('publicacoes', row[0])
        session.execute(text("DELETE FROM tb_site_publicacao WHERE pk = :pk"), {'pk': pk})
        return {'message': 'Publicação eliminada'}, 200


@api_error_handler
def cms_upload_publicacao_file(pk: int, file, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text(
            "SELECT titulo, ano, tipo, ficheiro_url FROM vbl_site_publicacao WHERE pk = :pk"
        ), {'pk': pk}).mappings().fetchone()
        if not row:
            raise ResourceNotFoundError('Publicação', pk)

        _delete_website_file('publicacoes', row['ficheiro_url'])

        ano    = str(row['ano']) if row['ano'] else str(datetime.now().year)
        tipo   = _slugify(row['tipo'] or 'outros')
        titulo = _slugify(row['titulo'] or f'publicacao-{pk}')
        ext    = os.path.splitext(file.filename)[1].lower() if file.filename else '.pdf'

        folder = os.path.join(current_app.config['FILES_DIR'], 'website', 'publicacoes', ano, tipo)
        os.makedirs(folder, exist_ok=True)

        filename = f"{titulo}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            filename = f"{titulo}-{pk}{ext}"

        file.save(os.path.join(folder, filename))
        rel_path = f"{ano}/{tipo}/{filename}"

        session.execute(
            text("UPDATE vbf_site_publicacao SET ficheiro_url = :f WHERE pk = :pk"),
            {'f': rel_path, 'pk': pk}
        )
        return {'ficheiro_url': _file_url('publicacoes', rel_path), 'filename': rel_path}, 200


# ─── CMS — Procedimentos RH ──────────────────────────────────────────────────

@api_error_handler
def cms_list_procedimentos(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, referencia, ts_tipo, tipo, titulo, ts_estado, estado,
                   num_vagas, municipio, visivel, data_abertura,
                   data_encerramento, num_fases, ultima_fase_data, ultima_fase_nome
            FROM vbl_site_procedimento
            ORDER BY data_abertura DESC NULLS LAST
        """)).mappings().all()
        return {'procedimentos': [_serialize(r) for r in rows]}, 200


@api_error_handler
def cms_get_procedimento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        proc = session.execute(text("""
            SELECT pk, referencia, ts_tipo, tipo, titulo, carreira,
                   categoria_prof, num_vagas, municipio, ts_estado, estado,
                   descricao, data_abertura, data_encerramento, visivel
            FROM vbl_site_procedimento WHERE pk = :pk
        """), {'pk': pk}).mappings().fetchone()
        if not proc:
            raise ResourceNotFoundError('Procedimento', pk)

        fases = session.execute(text("""
            SELECT pk, ts_tipo_fase, tipo_fase, label_custom, label,
                   data, ficheiro_url, notas, publicado, ordem
            FROM vbl_site_procedimento_fase
            WHERE procedimento_fk = :pk ORDER BY ordem
        """), {'pk': pk}).mappings().all()

        result = _serialize(proc)
        result['fases'] = []
        for f in fases:
            item = _serialize(f)
            item['ficheiro_url_display'] = _file_url('procedimentos', item.get('ficheiro_url'))
            result['fases'].append(item)

        return {'procedimento': result}, 200


@api_error_handler
def cms_save_procedimento(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        user_pk = session.execute(text("SELECT fs_client()")).scalar()

        session.execute(text("""
            SELECT fbf_site_procedimento(
                CAST(:pop AS SMALLINT), :pk, :referencia, CAST(:ts_tipo AS SMALLINT), :titulo, :carreira,
                :categoria_prof, CAST(:num_vagas AS SMALLINT), :municipio, CAST(:ts_estado AS SMALLINT),
                :descricao, :data_abertura, :data_enc, :visivel, :criado_por
            )
        """), {
            'pop': pop, 'pk': pk,
            'referencia':     data.get('referencia'),
            'ts_tipo':        data.get('ts_tipo'),
            'titulo':         data.get('titulo'),
            'carreira':       data.get('carreira'),
            'categoria_prof': data.get('categoria_prof'),
            'num_vagas':      data.get('num_vagas'),
            'municipio':      data.get('municipio'),
            'ts_estado':      data.get('ts_estado', 1),
            'descricao':      data.get('descricao'),
            'data_abertura':  data.get('data_abertura'),
            'data_enc':       data.get('data_encerramento'),
            'visivel':        data.get('visivel', True),
            'criado_por':     user_pk,
        })
        action = 'criado' if pop == 0 else 'atualizado'
        return {'pk': pk, 'message': f'Procedimento {action} com sucesso'}, 200


@api_error_handler
def cms_save_procedimento_fase(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        session.execute(text("""
            SELECT fbf_site_procedimento_fase(
                CAST(:pop AS SMALLINT), :pk, :procedimento, CAST(:ts_tipo_fase AS SMALLINT),
                :label_custom, :data, :ficheiro_url,
                :notas, :publicado, CAST(:ordem AS SMALLINT)
            )
        """), {
            'pop': pop, 'pk': pk,
            'procedimento':  data.get('procedimento_fk'),
            'ts_tipo_fase':  data.get('ts_tipo_fase'),
            'label_custom':  data.get('label_custom'),
            'data':          data.get('data'),
            'ficheiro_url':  data.get('ficheiro_url'),
            'notas':         data.get('notas'),
            'publicado':     data.get('publicado', False),
            'ordem':         data.get('ordem', 0),
        })
        action = 'criada' if pop == 0 else 'atualizada'
        return {'pk': pk, 'message': f'Fase {action} com sucesso'}, 200


@api_error_handler
def cms_delete_procedimento_fase(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT ficheiro_url FROM tb_site_procedimento_fase WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not row:
            raise ResourceNotFoundError('Fase', pk)
        _delete_website_file('procedimentos', row[0])
        session.execute(
            text("DELETE FROM tb_site_procedimento_fase WHERE pk = :pk"), {'pk': pk}
        )
        return {'message': 'Fase eliminada'}, 200


@api_error_handler
def cms_upload_fase_file(pk: int, file, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT f.label, f.data AS fase_data, f.ficheiro_url,
                   p.referencia, p.titulo AS proc_titulo, p.data_abertura
            FROM tb_site_procedimento_fase f
            JOIN tb_site_procedimento p ON p.pk = f.procedimento_fk
            WHERE f.pk = :pk
        """), {'pk': pk}).mappings().fetchone()
        if not row:
            raise ResourceNotFoundError('Fase', pk)

        _delete_website_file('procedimentos', row['ficheiro_url'])

        data_ref = row['fase_data'] or row['data_abertura']
        ano      = str(data_ref.year) if data_ref else str(datetime.now().year)
        ref      = _slugify(row['referencia'] or row['proc_titulo'] or f'proc-{pk}')
        label    = _slugify(row['label'] or f'fase-{pk}')
        ext      = os.path.splitext(file.filename)[1].lower() if file.filename else '.pdf'

        folder = os.path.join(current_app.config['FILES_DIR'], 'website', 'procedimentos', ano, ref)
        os.makedirs(folder, exist_ok=True)

        filename = f"{label}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            filename = f"{label}-{pk}{ext}"

        file.save(os.path.join(folder, filename))
        rel_path = f"{ano}/{ref}/{filename}"

        session.execute(
            text("UPDATE vbf_site_procedimento_fase SET ficheiro_url = :f WHERE pk = :pk"),
            {'f': rel_path, 'pk': pk}
        )
        return {'ficheiro_url': _file_url('procedimentos', rel_path), 'filename': rel_path}, 200


# ─── CMS — Processos Financeiros ─────────────────────────────────────────────

@api_error_handler
def cms_list_processos_financeiros(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, ts_tipo, tipo, ano_exercicio, titulo, ts_estado, estado,
                   visivel, num_documentos, num_publicados
            FROM vbl_site_processo_financeiro
            ORDER BY ano_exercicio DESC, ts_tipo
        """)).mappings().all()
        return {'processos': [_serialize(r) for r in rows]}, 200


@api_error_handler
def cms_get_processo_financeiro(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        proc = session.execute(text("""
            SELECT pk, ts_tipo, tipo, ano_exercicio, titulo, ts_estado,
                   estado, descricao, visivel
            FROM vbl_site_processo_financeiro WHERE pk = :pk
        """), {'pk': pk}).mappings().fetchone()
        if not proc:
            raise ResourceNotFoundError('Processo Financeiro', pk)

        docs = session.execute(text("""
            SELECT pk, ts_tipo_doc, tipo_doc, titulo, provisorio,
                   ficheiro_url, data_publicacao, ordem, publicado
            FROM vbl_site_processo_financeiro_doc
            WHERE processo_fk = :pk ORDER BY ordem
        """), {'pk': pk}).mappings().all()

        result = _serialize(proc)
        result['documentos'] = []
        for d in docs:
            item = _serialize(d)
            item['ficheiro_url_display'] = _file_url('financeiros', item.get('ficheiro_url'))
            result['documentos'].append(item)

        return {'processo': result}, 200


@api_error_handler
def cms_save_processo_financeiro(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        user_pk = session.execute(text("SELECT fs_client()")).scalar()

        session.execute(text("""
            SELECT fbf_site_processo_financeiro(
                CAST(:pop AS SMALLINT), :pk, CAST(:ts_tipo AS SMALLINT), CAST(:ano AS SMALLINT), :titulo,
                :descricao, CAST(:ts_estado AS SMALLINT), :visivel, :criado_por
            )
        """), {
            'pop': pop, 'pk': pk,
            'ts_tipo':   data.get('ts_tipo'),
            'ano':       data.get('ano_exercicio'),
            'titulo':    data.get('titulo'),
            'descricao': data.get('descricao'),
            'ts_estado': data.get('ts_estado', 1),
            'visivel':   data.get('visivel', False),
            'criado_por':user_pk,
        })
        action = 'criado' if pop == 0 else 'atualizado'
        return {'pk': pk, 'message': f'Processo financeiro {action} com sucesso'}, 200


@api_error_handler
def cms_save_processo_financeiro_doc(data: dict, current_user: str):
    with db_session_manager(current_user) as session:
        pk = data.get('pk')
        pop = 1 if pk else 0
        if not pk:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        data_pub = data.get('data_publicacao')
        if data_pub and isinstance(data_pub, str):
            try:
                from datetime import date
                data_pub = date.fromisoformat(data_pub)
            except Exception:
                data_pub = None

        session.execute(text("""
            SELECT fbf_site_processo_financeiro_doc(
                CAST(:pop AS SMALLINT), :pk, :processo_fk, CAST(:ts_tipo_doc AS SMALLINT), :titulo,
                :provisorio, :ficheiro_url, :data_pub, CAST(:ordem AS SMALLINT), :publicado
            )
        """), {
            'pop': pop, 'pk': pk,
            'processo_fk': data.get('processo_fk'),
            'ts_tipo_doc': data.get('ts_tipo_doc'),
            'titulo':      data.get('titulo'),
            'provisorio':  data.get('provisorio', False),
            'ficheiro_url':data.get('ficheiro_url'),
            'data_pub':    data_pub,
            'ordem':       data.get('ordem', 0),
            'publicado':   data.get('publicado', False),
        })
        action = 'criado' if pop == 0 else 'atualizado'
        return {'pk': pk, 'message': f'Documento {action} com sucesso'}, 200


@api_error_handler
def cms_delete_processo_financeiro_doc(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT ficheiro_url FROM tb_site_processo_financeiro_doc WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not row:
            raise ResourceNotFoundError('Documento', pk)
        _delete_website_file('financeiros', row[0])
        session.execute(
            text("DELETE FROM tb_site_processo_financeiro_doc WHERE pk = :pk"), {'pk': pk}
        )
        return {'message': 'Documento eliminado'}, 200


@api_error_handler
def cms_upload_processo_doc_file(pk: int, file, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT d.titulo, d.ficheiro_url,
                   p.ano_exercicio, t.name AS tipo_nome
            FROM tb_site_processo_financeiro_doc d
            JOIN tb_site_processo_financeiro p ON p.pk = d.processo_fk
            LEFT JOIN ts_site_processo_financeiro_tipo t ON t.pk = p.ts_tipo
            WHERE d.pk = :pk
        """), {'pk': pk}).mappings().fetchone()
        if not row:
            raise ResourceNotFoundError('Documento', pk)

        _delete_website_file('financeiros', row['ficheiro_url'])

        ano    = str(row['ano_exercicio']) if row['ano_exercicio'] else str(datetime.now().year)
        tipo   = _slugify(row['tipo_nome'] or 'outros')
        titulo = _slugify(row['titulo'] or f'documento-{pk}')
        ext    = os.path.splitext(file.filename)[1].lower() if file.filename else '.pdf'

        folder = os.path.join(current_app.config['FILES_DIR'], 'website', 'financeiros', ano, tipo)
        os.makedirs(folder, exist_ok=True)

        filename = f"{titulo}{ext}"
        if os.path.exists(os.path.join(folder, filename)):
            filename = f"{titulo}-{pk}{ext}"

        file.save(os.path.join(folder, filename))
        rel_path = f"{ano}/{tipo}/{filename}"

        session.execute(
            text("UPDATE vbf_site_processo_financeiro_doc SET ficheiro_url = :f WHERE pk = :pk"),
            {'f': rel_path, 'pk': pk}
        )
        return {'ficheiro_url': _file_url('financeiros', rel_path), 'filename': rel_path}, 200
