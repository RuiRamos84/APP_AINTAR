from sqlalchemy.sql import text
from ..utils.utils import db_session_manager, format_message


def update_etar_details(pk, data, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbf_etar(
                    1, -- pop = 1 para UPDATE
                    :pk,
                    :nome,
                    :coord_m,
                    :coord_p,
                    :apa_licenca,
                    :apa_data_ini,
                    :apa_data_fim,
                    :ener_entidade,
                    :ener_cpe,
                    :ener_potencia,
                    :ener_val
                )
            """)

            params = {
                'pk': pk,
                'nome': data.get('nome'),
                'coord_m': float(data.get('coord_m')) if data.get('coord_m') else None,
                'coord_p': float(data.get('coord_p')) if data.get('coord_p') else None,
                'apa_licenca': data.get('apa_licenca'),
                'apa_data_ini': data.get('apa_data_ini'),
                'apa_data_fim': data.get('apa_data_fim'),
                'ener_entidade': int(data.get('ener_entidade')) if data.get('ener_entidade') else None,
                'ener_cpe': data.get('ener_cpe'),
                'ener_potencia': float(data.get('ener_potencia')) if data.get('ener_potencia') else None,
                'ener_val': int(data.get('ener_val')) if data.get('ener_val') else None
            }

            result = session.execute(query, params).scalar()
            return {'message': 'ETAR actualizada com sucesso', 'pk': result}, 200
    except Exception as e:
        return {'error': f"Erro ao actualizar ETAR: {str(e)}"}, 500


def update_ee_details(pk, data, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbf_ee(
                    1, -- pop = 1 para UPDATE
                    :pk,
                    :nome,
                    :coord_m,
                    :coord_p,
                    :ener_entidade,
                    :ener_cpe,
                    :ener_potencia,
                    :ener_val
                )
            """)

            params = {
                'pk': pk,
                'nome': data.get('nome'),
                'coord_m': float(data.get('coord_m')) if data.get('coord_m') else None,
                'coord_p': float(data.get('coord_p')) if data.get('coord_p') else None,
                'ener_entidade': int(data.get('ener_entidade')) if data.get('ener_entidade') else None,
                'ener_cpe': data.get('ener_cpe'),
                'ener_potencia': float(data.get('ener_potencia')) if data.get('ener_potencia') else None,
                'ener_val': int(data.get('ener_val')) if data.get('ener_val') else None
            }

            result = session.execute(query, params).scalar()
            return {'message': 'EE actualizada com sucesso', 'pk': result}, 200
    except Exception as e:
        return {'error': f"Erro ao actualizar EE: {str(e)}"}, 500


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


def create_water_etar_volume(pnpk, pndate, pnval, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_etar_waterread_createdirect(:pnpk, :pndate, :pnval)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval': pnval
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Volume de água registado com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar volume de água: {str(e)}"}, 500


def create_water_ee_volume(pnpk, pndate, pnval, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_ee_waterread_createdirect(:pnpk, :pndate, :pnval)")
            result = session.execute(query, {
                'pnpk': pnpk,
                'pndate': pndate,
                'pnval': pnval
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Volume de água registado com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar volume de água: {str(e)}"}, 500


def list_etar_water_volumes(tb_etar, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_etar_waterread WHERE tb_etar = :tb_etar order by data desc")
            results = session.execute(query, {'tb_etar': tb_etar}).fetchall()
            water_volumes = [dict(row._mapping) for row in results]
            return {'water_volumes': water_volumes}, 200
    except Exception as e:
        return {'error': f"Erro ao listar volumes de água de ETAR: {str(e)}"}, 500


def list_ee_water_volumes(tb_ee, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_ee_waterread WHERE tb_ee = :tb_ee order by data desc")
            results = session.execute(query, {'tb_ee': tb_ee}).fetchall()
            water_volumes = [dict(row._mapping) for row in results]
            return {'water_volumes': water_volumes}, 200
    except Exception as e:
        return {'error': f"Erro ao listar volumes de água de EE: {str(e)}"}, 500


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


def create_etar_desmatacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de desmatação para ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(20, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar
            }).scalar()
            return {'message': 'Pedido de desmatação para ETAR criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de desmatação para ETAR: {str(e)}"}, 500


def create_etar_retirada_lamas(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de retirada de lamas para ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(40, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar
            }).scalar()
            return {'message': 'Pedido de retirada de lamas para ETAR criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de retirada de lamas para ETAR: {str(e)}"}, 500


def create_etar_reparacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de reparação para ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(45, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar
            }).scalar()
            return {'message': 'Pedido de reparação para ETAR criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação para ETAR: {str(e)}"}, 500


def create_etar_vedacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de vedação para ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(47, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar
            }).scalar()
            return {'message': 'Pedido de vedação para ETAR criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de vedação para ETAR: {str(e)}"}, 500


def create_etar_qualidade_ambiental(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de controlo de qualidade ambiental para ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(49, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar
            }).scalar()
            return {'message': 'Pedido de controlo de qualidade ambiental para ETAR criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de controlo de qualidade ambiental para ETAR: {str(e)}"}, 500

# Funções para EE


def create_ee_desmatacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de desmatação para EE"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(20, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_ee': pnpk_ee
            }).scalar()
            return {'message': 'Pedido de desmatação para EE criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de desmatação para EE: {str(e)}"}, 500


def create_ee_retirada_lamas(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de retirada de lamas para EE"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(41, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_ee': pnpk_ee
            }).scalar()
            return {'message': 'Pedido de retirada de lamas para EE criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de retirada de lamas para EE: {str(e)}"}, 500


def create_ee_reparacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de reparação para EE"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(46, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_ee': pnpk_ee
            }).scalar()
            return {'message': 'Pedido de reparação para EE criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação para EE: {str(e)}"}, 500


def create_ee_vedacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de vedação para EE"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(48, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_ee': pnpk_ee
            }).scalar()
            return {'message': 'Pedido de vedação para EE criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de vedação para EE: {str(e)}"}, 500


def create_ee_qualidade_ambiental(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de controlo de qualidade ambiental para EE"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(49, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_ee': pnpk_ee
            }).scalar()
            return {'message': 'Pedido de controlo de qualidade ambiental para EE criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de controlo de qualidade ambiental para EE: {str(e)}"}, 500

# Funções para Rede


def create_rede_desobstrucao(pnts_associate, pnmemo, current_user):
    """Criar pedido de desobstrução para Rede"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(28, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de desobstrução para Rede criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de desobstrução para Rede: {str(e)}"}, 500


def create_rede_reparacao_colapso(pnts_associate, pnmemo, current_user):
    """Criar pedido de reparação/colapso para Rede"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(27, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de reparação/colapso para Rede criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação/colapso para Rede: {str(e)}"}, 500

# Funções para Caixas


def create_caixa_desobstrucao(pnts_associate, pnmemo, current_user):
    """Criar pedido de desobstrução para Caixas"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(23, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de desobstrução para Caixas criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de desobstrução para Caixas: {str(e)}"}, 500


def create_caixa_reparacao(pnts_associate, pnmemo, current_user):
    """Criar pedido de reparação para Caixas"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(22, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de reparação para Caixas criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação para Caixas: {str(e)}"}, 500


def create_caixa_reparacao_tampa(pnts_associate, pnmemo, current_user):
    """Criar pedido de reparação de tampa para Caixas"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(29, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de reparação de tampa para Caixas criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação de tampa para Caixas: {str(e)}"}, 500

# Funções para Ramais


def create_ramal_desobstrucao(pnts_associate, pnmemo, current_user):
    """Criar pedido de desobstrução para Ramais"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(25, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de desobstrução para Ramais criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de desobstrução para Ramais: {str(e)}"}, 500


def create_ramal_reparacao(pnts_associate, pnmemo, current_user):
    """Criar pedido de reparação para Ramais"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(24, :pnts_associate, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de reparação para Ramais criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de reparação para Ramais: {str(e)}"}, 500

# Função para Requisição Interna


def create_requisicao_interna(pnmemo, current_user):
    """Criar pedido de requisição interna"""
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_document_createintern(19, NULL, :pnmemo, NULL, NULL)")
            result = session.execute(query, {
                'pnmemo': pnmemo
            }).scalar()
            return {'message': 'Pedido de requisição interna criado com sucesso', 'document_id': result}, 201
    except Exception as e:
        return {'error': f"Erro ao criar pedido de requisição interna: {str(e)}"}, 500


def create_etar_incumprimento(tb_etar, tt_analiseparam, resultado, limite, data, operador1, operador2, current_user):
    """Registar incumprimento em ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbo_etar_incumprimento_createdirect(
                    :tb_etar, :tt_analiseparam, :resultado, :limite, :data, :operador1, :operador2
                )
            """)
            result = session.execute(query, {
                'tb_etar': tb_etar,
                'tt_analiseparam': tt_analiseparam,
                'resultado': resultado,
                'limite': limite,
                'data': data,
                'operador1': operador1,
                'operador2': operador2
            }).scalar()
            success_message = format_message(result)
            return {'message': 'Incumprimento registado com sucesso', 'result': success_message}, 201
    except Exception as e:
        return {'error': f"Erro ao registar incumprimento: {str(e)}"}, 500


def list_etar_incumprimentos(tb_etar, current_user):
    """Listar incumprimentos de uma ETAR"""
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT * FROM vbl_etar_incumprimento
                WHERE tb_etar = :tb_etar
                ORDER BY data DESC
            """)
            results = session.execute(query, {'tb_etar': tb_etar}).fetchall()
            incumprimentos = [dict(row._mapping) for row in results]
            return {'incumprimentos': incumprimentos}, 200
    except Exception as e:
        return {'error': f"Erro ao listar incumprimentos: {str(e)}"}, 500
