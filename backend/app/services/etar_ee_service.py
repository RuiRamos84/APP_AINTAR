from sqlalchemy.sql import text
from ..utils.utils import db_session_manager, format_message


def create_etar_document(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT fbo_etar_document_createdirect(:pk)")
            result = session.execute(query, {'pk': pk}).scalar()
            # Extrai apenas o conteúdo da tag <sucess>
            formated_message = format_message(result)
            print(formated_message)
            return {'result': formated_message}, 201
    except Exception as e:
        return {'error': f"Erro ao criar documento ETAR: {str(e)}"}, 500


def create_ee_document(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT fbo_ee_document_createdirect(:pk)")
            result = session.execute(query, {'pk': pk}).scalar()
            # Extrai apenas o conteúdo da tag <sucess>
            formated_message = format_message(result)
            print(formated_message)
            return {'result': formated_message}, 201
    except Exception as e:
        return {'error': f"Erro ao criar documento EE: {str(e)}"}, 500


def create_etar_volume(pnpk, pndate, pnval, pnspot, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_etar_volumeread_createdirect(:pnpk, :pndate, :pnval, :pnspot)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval': pnval,
                'pnspot': pnspot
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Volume de ETAR registado com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar volume de ETAR: {str(e)}"}, 500


def create_ee_volume(pnpk, pndate, pnval, pnspot, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_ee_volumeread_createdirect(:pnpk, :pndate, :pnval, :pnspot)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval': pnval,
                'pnspot': pnspot
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Volume de EE registado com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar volume de EE: {str(e)}"}, 500


def list_etar_volumes(tb_etar, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_etar_volumeread WHERE tb_etar = :tb_etar order by data desc")
            results = session.execute(query, {'tb_etar': tb_etar}).fetchall()
            volumes = [dict(row._mapping) for row in results]
            # print(volumes)
            return {'volumes': volumes}, 200
    except Exception as e:
        return {'error': f"Erro ao listar volumes de ETAR: {str(e)}"}, 500


def list_ee_volumes(tb_ee, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_ee_volumeread WHERE tb_ee = :tb_ee  order by data desc")
            results = session.execute(query, {'tb_ee': tb_ee}).fetchall()
            volumes = [dict(row._mapping) for row in results]
            return {'volumes': volumes}, 200
    except Exception as e:
        return {'error': f"Erro ao listar volumes de EE: {str(e)}"}, 500


def create_etar_energy(pnpk, pndate, pnval_vazio, pnval_ponta, pnval_cheia, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_etar_energyread_createdirect(:pnpk, :pndate, :pnval_vazio, :pnval_ponta, :pnval_cheia)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval_vazio': pnval_vazio,
                'pnval_ponta': pnval_ponta,
                'pnval_cheia': pnval_cheia
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Energia de ETAR registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar energia de ETAR: {str(e)}"}, 500


def create_ee_energy(pnpk, pndate, pnval_vazio, pnval_ponta, pnval_cheia, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_ee_energyread_createdirect(:pnpk, :pndate, :pnval_vazio, :pnval_ponta, :pnval_cheia)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval_vazio': pnval_vazio,
                'pnval_ponta': pnval_ponta,
                'pnval_cheia': pnval_cheia
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Energia de EE registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar energia de EE: {str(e)}"}, 500


def list_etar_energy(tb_etar, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_etar_energyread WHERE tb_etar = :tb_etar order by data desc")
            results = session.execute(query, {'tb_etar': tb_etar}).fetchall()
            energy = [dict(row._mapping) for row in results]
            return {'energy': energy}, 200
    except Exception as e:
        return {'error': f"Erro ao listar energia de ETAR: {str(e)}"}, 500


def list_ee_energy(tb_ee, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_ee_energyread WHERE tb_ee = :tb_ee  order by data desc")
            results = session.execute(query, {'tb_ee': tb_ee}).fetchall()
            energy = [dict(row._mapping) for row in results]
            return {'energy': energy}, 200
    except Exception as e:
        return {'error': f"Erro ao listar energia de EE: {str(e)}"}, 500


def create_etar_expense(pntt_expensedest, pndate, pnval, pntt_etar, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_expense_etar_create(:pntt_expensedest, :pndate, :pnval, :pntt_etar, :pnts_associate,  :pnmemo )")
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pntt_etar': pntt_etar,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa em ETAR registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa em ETAR: {str(e)}"}, 500


def create_ee_expense(pntt_expensedest, pndate, pnval, pntt_ee, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_expense_ee_create(:pntt_expensedest, :pndate, :pnval, :pntt_ee, :pnts_associate, :pnmemo)")
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pntt_ee': pntt_ee,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa em EE registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa em EE: {str(e)}"}, 500


def create_rede_expense(pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_expense_rede_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa na rede registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa na rede: {str(e)}"}, 500


def create_ramal_expense(pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_expense_ramal_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa no ramal registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa no ramal: {str(e)}"}, 500


def list_etar_expenses(tb_etar, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT * FROM vbl_expense WHERE tb_etar = :tb_etar order by data desc")
            results = session.execute(query, {'tb_etar': tb_etar}).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas para a ETAR: {str(e)}"}, 500


def list_ee_expenses(tb_ee, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_expense WHERE tb_ee = :tb_ee order by data desc")
            results = session.execute(query, {'tb_ee': tb_ee}).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas para a EE: {str(e)}"}, 500


def list_rede_expenses(current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_expense WHERE tt_expensetype = 3 order by data desc")
            results = session.execute(query).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas para a rede: {str(e)}"}, 500


def list_ramal_expenses(current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_expense WHERE tt_expensetype = 4 order by data desc")
            results = session.execute(query).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas para os ramais: {str(e)}"}, 500


def get_etar_details_by_pk(current_user, pk):
    """
    Obter detalhes de uma ETAR específica a partir da view vbf_etar.
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT * FROM vbf_etar WHERE pk = :pk")
            result = session.execute(query, {'pk': pk}).fetchone()
            if result:
                return {'details': dict(result._mapping)}, 200
            else:
                return {'error': 'ETAR não encontrada.'}, 404
    except Exception as e:
        return {'error': f"Erro ao obter detalhes da ETAR: {str(e)}"}, 500


def get_ee_details_by_pk(current_user, pk):
    """
    Obter detalhes de uma EE específica a partir da view vbf_ee.
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT * FROM vbf_ee WHERE pk = :pk")
            result = session.execute(query, {'pk': pk}).fetchone()
            if result:
                return {'details': dict(result._mapping)}, 200
            else:
                return {'error': 'EE não encontrada.'}, 404
    except Exception as e:
        return {'error': f"Erro ao obter detalhes da EE: {str(e)}"}, 500


def create_manut_expense(pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_expense_manut_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa de Material de Manutenção registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa de Material de Manutenção: {str(e)}"}, 500


def list_manut_expenses(current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_expense WHERE tt_expensetype = 5 order by data desc")
            results = session.execute(query).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas de Material de Manutenção: {str(e)}"}, 500


def create_equip_expense(pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbo_expense_equip_create(
                    :pntt_expensedest,
                    :pndate,
                    :pnval,
                    :pnts_associate,
                    :pnmemo
                )
            """)
            result = session.execute(query, {
                'pntt_expensedest': pntt_expensedest,
                'pndate': pndate,
                'pnval': pnval,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Despesa de Equipamento registada com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar despesa de Equipamento: {str(e)}"}, 500


def list_equip_expenses(current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT * FROM vbl_expense
                WHERE tt_expensetype = 6
                ORDER BY data DESC
            """)
            results = session.execute(query).fetchall()
            expenses = [dict(row._mapping) for row in results]
            return {'expenses': expenses}, 200
    except Exception as e:
        return {'error': f"Erro ao listar despesas de Equipamento: {str(e)}"}, 500
