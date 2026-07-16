"""
Testes unitários — rh_service.py::_dias_problematicos_mes

Esta função decide se o mapa mensal de ponto pode ser submetido: qualquer
dia útil sem registo, incompleto (sem Saída), ou com uma ausência parcial
ainda sem motivo legal escolhido, bloqueia a submissão. Cobre as três
categorias devolvidas (dias_sem_registo / dias_incompletos /
dias_por_justificar) e as exclusões por férias, faltas e participações
introduzidas ao longo da sessão de 2026-07-15/16.

Usa Fevereiro de 2026 (mês fixo, sem ano bissexto) para ter datas
determinísticas; os dias úteis/fim-de-semana são calculados a partir do
próprio `date.isoweekday()`, nunca hardcoded, para não depender de contar
à mão o calendário.
"""
from datetime import date
from unittest.mock import MagicMock

ANO, MES = 2026, 2
DIAS_UTEIS_OMISSAO = {1, 2, 3, 4, 5}  # segunda a sexta — default sem horário próprio


def _dias_do_mes():
    return [date(ANO, MES, d) for d in range(1, 29)]


def _primeiro_dia_util():
    return next(d for d in _dias_do_mes() if d.isoweekday() in DIAS_UTEIS_OMISSAO)


def _primeiro_fim_de_semana():
    return next(d for d in _dias_do_mes() if d.isoweekday() not in DIAS_UTEIS_OMISSAO)


def _build_session(*, horario_dias_semana=None, feriados=(), ferias=(), faltas=(),
                    participacoes_dia=(), participacoes_parcial=(), registos=()):
    """
    Sessão mock que devolve, pela ordem exacta das 7 queries de
    _dias_problematicos_mes, os dados fornecidos — evita montar um mock de
    BD real só para testar a lógica de agregação de dias.
    """
    session = MagicMock()

    mock_horario = MagicMock()
    mock_horario.mappings.return_value.first.return_value = (
        {'dias_semana': horario_dias_semana} if horario_dias_semana is not None else None
    )

    mock_feriados = MagicMock()
    mock_feriados.fetchall.return_value = [(d,) for d in feriados]

    mock_ferias = MagicMock()
    mock_ferias.fetchall.return_value = list(ferias)

    mock_faltas = MagicMock()
    mock_faltas.fetchall.return_value = [(d,) for d in faltas]

    mock_part_dia = MagicMock()
    mock_part_dia.fetchall.return_value = list(participacoes_dia)

    mock_part_parcial = MagicMock()
    mock_part_parcial.fetchall.return_value = list(participacoes_parcial)

    mock_registos = MagicMock()
    mock_registos.mappings.return_value.all.return_value = list(registos)

    session.execute.side_effect = [
        mock_horario, mock_feriados, mock_ferias, mock_faltas,
        mock_part_dia, mock_part_parcial, mock_registos,
    ]
    return session


def _call(session):
    from app.services.rh_service import _dias_problematicos_mes
    return _dias_problematicos_mes(session, user_fk=1, ano=ANO, mes=MES)


class TestDiasSemRegisto:

    def test_mes_sem_nenhum_registo_marca_todos_os_dias_uteis(self):
        session = _build_session()
        result = _call(session)

        esperados = [d.isoformat() for d in _dias_do_mes() if d.isoweekday() in DIAS_UTEIS_OMISSAO]
        assert result['dias_sem_registo'] == esperados
        assert result['dias_incompletos'] == []
        assert result['dias_por_justificar'] == []

    def test_feriado_nao_conta_como_sem_registo(self):
        dia = _primeiro_dia_util()
        session = _build_session(feriados=[dia])
        result = _call(session)

        assert dia.isoformat() not in result['dias_sem_registo']

    def test_dia_coberto_por_ferias_aprovadas_nao_conta_como_sem_registo(self):
        session = _build_session(ferias=[(date(ANO, MES, 1), date(ANO, MES, 28))])
        result = _call(session)

        assert result['dias_sem_registo'] == []

    def test_dia_com_falta_nao_rejeitada_nao_conta_como_sem_registo(self):
        dia = _primeiro_dia_util()
        session = _build_session(faltas=[dia])
        result = _call(session)

        assert dia.isoformat() not in result['dias_sem_registo']

    def test_dia_coberto_por_participacao_tipo_dia_nao_conta_como_sem_registo(self):
        """
        Correcção da sessão de 2026-07-15: participações de dia completo
        (aprovadas ou ainda pendentes, não rejeitadas) também justificam a
        ausência de ponto — mesmo tratamento que férias/faltas.
        """
        session = _build_session(participacoes_dia=[(date(ANO, MES, 1), date(ANO, MES, 28))])
        result = _call(session)

        assert result['dias_sem_registo'] == []

    def test_horario_customizado_restringe_dias_uteis(self):
        session = _build_session(horario_dias_semana=[1, 2, 3])  # só segunda a quarta
        result = _call(session)

        for iso in result['dias_sem_registo']:
            assert date.fromisoformat(iso).isoweekday() in {1, 2, 3}


class TestDiasIncompletos:

    def test_dia_so_com_entrada_marca_incompleto(self):
        dia = _primeiro_dia_util()
        session = _build_session(registos=[{'data': dia, 'eventos': [1]}])
        result = _call(session)

        assert dia.isoformat() in result['dias_incompletos']
        assert dia.isoformat() not in result['dias_sem_registo']

    def test_dia_com_entrada_e_saida_nao_marca_incompleto(self):
        """Evento 4 = Saída — presente, o dia fica completo."""
        dia = _primeiro_dia_util()
        session = _build_session(registos=[{'data': dia, 'eventos': [1, 4]}])
        result = _call(session)

        assert dia.isoformat() not in result['dias_incompletos']
        assert dia.isoformat() not in result['dias_sem_registo']


class TestDiasPorJustificar:

    def test_participacao_parcial_sem_motivo_marca_por_justificar(self):
        dia = _primeiro_dia_util()
        session = _build_session(participacoes_parcial=[(dia, dia)])
        result = _call(session)

        assert dia.isoformat() in result['dias_por_justificar']

    def test_participacao_parcial_bloqueia_mesmo_em_fim_de_semana(self):
        """
        A participação parcial só existe porque o colaborador de facto
        picou Saída Temporária + Regresso nesse dia (ver
        registar_ponto_evento) — bloqueia independentemente de ser dia
        útil, feriado ou fim-de-semana.
        """
        dia = _primeiro_fim_de_semana()
        session = _build_session(participacoes_parcial=[(dia, dia)])
        result = _call(session)

        assert dia.isoformat() in result['dias_por_justificar']
        assert dia.isoformat() not in result['dias_sem_registo']
        assert dia.isoformat() not in result['dias_incompletos']
