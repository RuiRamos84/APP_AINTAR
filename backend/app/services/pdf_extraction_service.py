import re
import unicodedata
import difflib
from datetime import date

import pdfplumber
from sqlalchemy.sql import text

from ..utils.utils import db_session_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)


# Nomes de parâmetro tal como aparecem nos boletins CESAB -> pk em tt_analiseparam.
# Parâmetros não listados aqui (ex: "Óleos Minerais") são ignorados — não há
# correspondência na tabela de incumprimentos.
PARAMETROS_PDF = {
    'pH': 1,
    'Sólidos Suspensos Totais': 2,
    'Carência Química de Oxigénio': 3,
    'Óleos e Gorduras': 4,
    'Carência Bioquímica de Oxigénio': 5,
    'Azoto Total': 6,
    'Azoto Amoniacal': 7,
    'Nitratos': 8,
    'Fósforo Total': 9,
    'Sólidos Suspensos Voláteis': 510,
}

RIGHT_LABELS = r'(?:Colheita|Rece[cç][aã]o|In[ií]cio An[aá]lise|Fim An[aá]lise|Emiss[aã]o)\s*:'


def _normalize(value):
    if not value:
        return ''
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    return value.strip().lower()


def _parse_data_pt(value):
    """Converte 'DD/MM/AAAA' ou 'AAAA-MM-DD' (com ou sem hora) para date.

    A CESAB já emitiu boletins nos dois formatos consoante a versão do
    software do laboratório — aceitar ambos evita que a data fique por
    identificar quando o formato muda."""
    if not value:
        return None
    match = re.match(r'(\d{2})/(\d{2})/(\d{4})', value)
    if match:
        d, m, y = match.groups()
        return date(int(y), int(m), int(d))
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})', value)
    if match:
        y, m, d = match.groups()
        return date(int(y), int(m), int(d))
    return None


def _parse_numero(token):
    """Converte um token numérico do boletim (vírgula decimal, prefixo '<') para float."""
    if token is None:
        return None
    token = token.strip().lstrip('<').replace(',', '.')
    try:
        return float(token)
    except ValueError:
        return None


def _extract_header(texto):
    header = {}

    m = re.search(r'Relat[óo]rio de Ensaio N\.?[ºo]\s*(\S+)', texto)
    header['numero_boletim'] = m.group(1) if m else None

    m = re.search(r'[ÁA]rea:\s*(.+?)\s*(?:' + RIGHT_LABELS + r'|$)', texto)
    header['area'] = m.group(1).strip() if m else None

    m = re.search(r'Local de Colheita:\s*(.+?)\s*(?:' + RIGHT_LABELS + r'|$)', texto)
    header['local_colheita'] = m.group(1).strip() if m else None

    m = re.search(r'Controlo:\s*(\w+)', texto)
    header['controlo'] = m.group(1) if m else None

    m = re.search(r'\bColheita:\s*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})', texto)
    header['data_colheita'] = _parse_data_pt(m.group(1)) if m else None

    m = re.search(r'Emiss[ãa]o:\s*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})', texto)
    header['data_emissao'] = _parse_data_pt(m.group(1)) if m else None

    local_norm = _normalize(header.get('local_colheita'))
    if 'entrada' in local_norm:
        header['tipo'] = 'entrada'
    elif 'saida' in local_norm or 'saída' in (header.get('local_colheita') or '').lower():
        header['tipo'] = 'saida'
    else:
        header['tipo'] = 'indeterminado'

    return header


def _extract_parametros(texto):
    """Extrai os resultados da secção 'Resultados dos Ensaios'.

    Cada linha de resultado segue o padrão fixo:
        Nome  Resultado  Unidade(s)  UAN(%)  UAM(%)  LQ  LD  VMR  VL
    Os últimos 6 tokens são sempre UAN/UAM/LQ/LD/VMR/VL (colunas de largura
    fixa); o resultado é sempre o primeiro token a seguir ao nome; tudo o que
    sobra no meio é a unidade. Isto evita ter de tratar casos especiais (ex.
    unidades com 1 ou 2 tokens, ou a linha irregular do pH).
    """
    inicio = texto.find('Resultados dos Ensaios')
    fim = texto.find('Este relatório')
    secao = texto[inicio:fim] if inicio != -1 else texto

    parametros = []
    for nome, pk in PARAMETROS_PDF.items():
        m = re.search(r'^\s*' + re.escape(nome) + r'\b(.*)$', secao, re.MULTILINE)
        if not m:
            continue
        tokens = m.group(1).split()
        if len(tokens) < 7:
            continue  # linha incompleta/inesperada — ignorar em vez de adivinhar

        resultado_tok = tokens[0]
        uan, uam, lq, ld, vmr, vl = tokens[-6:]
        unidade = ' '.join(tokens[1:-6]).strip()

        resultado_num = _parse_numero(resultado_tok)
        limite, limitemin, conforme = _avaliar_conformidade(resultado_tok, resultado_num, vl)

        parametros.append({
            'tt_analiseparam': pk,
            'nome': nome,
            'resultado': resultado_num,
            'resultado_texto': resultado_tok,
            'unidade': unidade,
            'vl': vl,
            'limite': limite,
            'limitemin': limitemin,
            'conforme': conforme,
        })

    _log_parametros_desconhecidos(secao, PARAMETROS_PDF.keys())
    return parametros


def _log_parametros_desconhecidos(secao, nomes_conhecidos):
    """Regista os parâmetros do boletim que não têm correspondência em
    PARAMETROS_PDF. Sem isto, um parâmetro novo introduzido pela CESAB seria
    ignorado silenciosamente em vez de aparecer como uma lacuna a preencher."""
    conhecidos = set(nomes_conhecidos)
    desconhecidos = set()
    for linha in secao.splitlines():
        m = re.match(r'^\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.]*?)\s+[\d,.<-]+\s', linha)
        if not m:
            continue
        nome = m.group(1).strip()
        if nome and nome not in conhecidos:
            desconhecidos.add(nome)
    if desconhecidos:
        logger.info(f"Boletim PDF: parâmetros não reconhecidos (ignorados): {sorted(desconhecidos)}")


def _avaliar_conformidade(resultado_tok, resultado_num, vl):
    """Devolve (limite, limitemin, conforme) a partir do valor VL do boletim."""
    vl = (vl or '').strip()

    if vl in ('-', '---', ''):
        return None, None, True  # sem limite definido

    range_match = re.match(r'^([\d,]+)-([\d,]+)$', vl)
    if range_match:
        limitemin = _parse_numero(range_match.group(1))
        limite = _parse_numero(range_match.group(2))
        if resultado_num is None or limitemin is None or limite is None:
            return limite, limitemin, True
        return limite, limitemin, limitemin <= resultado_num <= limite

    limite = _parse_numero(vl)
    if limite is None:
        return None, None, True

    if resultado_tok.strip().startswith('<'):
        return limite, None, True  # abaixo do limite de quantificação

    if resultado_num is None:
        return limite, None, True

    return limite, None, resultado_num <= limite


def extract_lab_report(file_stream):
    """Extrai os dados estruturados de um boletim de ensaio (PDF) da CESAB.

    Devolve um dicionário com os campos de cabeçalho (instalação/local de
    colheita, datas, controlo) e a lista de parâmetros ensaiados, cada um já
    avaliado quanto à conformidade face ao VL. Não escreve nada na BD —
    a confirmação e gravação são sempre feitas explicitamente pelo utilizador.
    """
    with pdfplumber.open(file_stream) as pdf:
        texto = '\n'.join(page.extract_text() or '' for page in pdf.pages)

    header = _extract_header(texto)
    parametros = _extract_parametros(texto)

    nao_conformes = [p for p in parametros if not p['conforme']]
    sugestao_cumprimento = None
    if header['tipo'] == 'saida' and parametros:
        sugestao_cumprimento = 0 if nao_conformes else 1

    # Flask serializa datetime.date como string RFC-1123 (ex: "Thu, 02 Apr 2026...")
    # em vez de ISO — converter aqui para que o valor devolvido ao frontend seja
    # sempre 'YYYY-MM-DD' e possa ser reenviado tal e qual ao gravar o período.
    header['data_colheita'] = header['data_colheita'].isoformat() if header['data_colheita'] else None
    header['data_emissao'] = header['data_emissao'].isoformat() if header['data_emissao'] else None

    return {
        **header,
        'parametros': parametros,
        'nao_conformidades': nao_conformes,
        'sugestao_cumprimento': sugestao_cumprimento,
    }


def sugerir_instalacao(current_user, local_colheita):
    """Sugere uma instalação (ETAR) para o 'Local de Colheita' do boletim.

    Prioridade: 1) mapeamento já confirmado anteriormente para este texto
    exato; 2) correspondência aproximada (fuzzy) pelo nome da instalação.
    """
    if not local_colheita:
        return {'sugestao': None, 'candidatos': [], 'origem': None}

    with db_session_manager(current_user) as session:
        mapeado = None
        try:
            mapeado = session.execute(
                text("""
                    SELECT m.tb_instalacao, e.nome
                    FROM vbl_pdf_local_colheita m
                    JOIN vbf_etar e ON e.pk = m.tb_instalacao
                    WHERE m.local_colheita = :local_colheita
                """),
                {'local_colheita': local_colheita}
            ).mappings().first()
        except Exception:
            # View/tabela de memória ainda não criada (ver backend/sql/pdf_boletim_mapping.sql) —
            # degradar para sugestão por fuzzy-match em vez de falhar o pedido.
            session.rollback()
            logger.warning('vbl_pdf_local_colheita indisponível — a usar apenas fuzzy-match', exc_info=True)

        if mapeado:
            return {
                'sugestao': {'pk': mapeado['tb_instalacao'], 'nome': mapeado['nome']},
                'candidatos': [],
                'origem': 'memoria',
            }

        instalacoes = session.execute(text('SELECT pk, nome FROM vbf_etar')).mappings().all()

    # 1ª tentativa: o nome da instalação aparece literalmente dentro do texto do
    # "Local de Colheita" (ex: "Currelos" em "ETAR Currelos- Subsistema Currelos -
    # Saída"). Isto é muito mais fiável do que comparar as duas frases completas por
    # fuzzy-ratio, que se deixa distrair por palavras de preenchimento partilhadas
    # (ex: "Saída", "-") e pode sugerir uma instalação totalmente errada.
    local_norm = _normalize(local_colheita)
    por_substring = [
        row for row in instalacoes
        if len(_normalize(row['nome'])) >= 3 and _normalize(row['nome']) in local_norm
    ]
    if por_substring:
        por_substring.sort(key=lambda r: len(r['nome']), reverse=True)
        candidatos = [{'pk': r['pk'], 'nome': r['nome']} for r in por_substring[:5]]
        return {'sugestao': candidatos[0], 'candidatos': candidatos, 'origem': 'substring'}

    # 2ª tentativa (mais fraca): fuzzy-ratio sobre a frase completa, só quando não
    # houve nenhuma correspondência literal.
    nomes = [row['nome'] for row in instalacoes]
    por_nome = {row['nome']: row['pk'] for row in instalacoes}
    melhores = difflib.get_close_matches(local_colheita, nomes, n=5, cutoff=0.4)
    candidatos = [{'pk': por_nome[n], 'nome': n} for n in melhores]

    return {
        'sugestao': candidatos[0] if candidatos else None,
        'candidatos': candidatos,
        'origem': 'fuzzy' if candidatos else None,
    }


def confirmar_mapeamento_instalacao(current_user, local_colheita, tb_instalacao):
    """Guarda (ou atualiza) o mapeamento 'Local de Colheita' -> instalação,
    para que boletins futuros com o mesmo texto sejam sugeridos automaticamente."""
    with db_session_manager(current_user) as session:
        session.execute(
            text("SELECT fbf_pdf_local_colheita(0, :local_colheita, :tb_instalacao)"),
            {'local_colheita': local_colheita, 'tb_instalacao': tb_instalacao}
        )
    return {'message': 'Mapeamento guardado com sucesso'}, 200
