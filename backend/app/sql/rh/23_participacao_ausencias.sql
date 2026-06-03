-- backend/app/sql/rh/23_participacao_ausencias.sql
-- Participação de Faltas e Ausências Parciais (Art.º 134.º LGTFP + CT)
-- Executar APÓS 22_face_recognition.sql
--
-- O que cria:
--   1. ts_rh_falta_motivo      — lookup de motivos legais
--   2. tt_rh_estado_workflow   — 3 novos estados (5-6-7) para despacho presidência
--   3. tt_rh_ponto_evento      — eventos 5 (Saída Temporária) e 6 (Regresso)
--   4. tb_rh_participacao      — tabela principal (dia completo + parcial)
--   5. vbl_rh_participacao     — view de leitura
--   6. fbo_rh_participacao     — upsert (INSERT/UPDATE)
--   7. fbo_rh_participacao_wf  — workflow 3 níveis (Serviço → RH → Presidência)

-- ═══════════════════════════════════════════════════════════════
-- 1. LOOKUP: MOTIVOS LEGAIS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ts_rh_falta_motivo (
    pk          SERIAL      PRIMARY KEY,
    artigo      VARCHAR(40) NOT NULL,
    descricao   TEXT        NOT NULL,
    -- TRUE = pode ser usado em ausências parciais (horas)
    -- FALSE = só dias completos (ex: casamento, maternidade)
    parcial_ok  BOOLEAN     NOT NULL DEFAULT TRUE,
    ativo       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO ts_rh_falta_motivo (artigo, descricao, parcial_ok) VALUES
  ('134.º, n.º2, a)', 'Casamento',                                                                FALSE),
  ('134.º, n.º2, b)', 'Falecimento do cônjuge, parentes ou afins',                                FALSE),
  ('134.º, n.º2, c)', 'Provas escolares',                                                          TRUE),
  ('134.º, n.º2, d)', 'Doença, acidente ou obrigação legal',                                       TRUE),
  ('134.º, n.º2, e)', 'Assistência inadiável a filho, neto ou membro do agregado familiar',       TRUE),
  ('134.º, n.º2, f)', 'Situação educativa de filho (ou equiparado) menor',                        TRUE),
  ('134.º, n.º2, g)', 'Eleitos nas estruturas de representação coletiva',                          FALSE),
  ('134.º, n.º2, h)', 'Candidatos em eleições para cargos políticos (período de campanha)',       FALSE),
  ('134.º, n.º2, i)', 'Tratamento ambulatório, consultas médicas e exames complementares',        TRUE),
  ('134.º, n.º2, j)', 'Isolamento profilático',                                                    FALSE),
  ('134.º, n.º2, k)', 'Doação de sangue e socorrismo',                                            TRUE),
  ('134.º, n.º2, l)', 'Submissão a métodos de seleção em procedimento concursal',                 TRUE),
  ('134.º, n.º2, m)', 'Por conta do período de férias',                                           TRUE),
  ('134.º, n.º2, n)', 'Consideradas justificadas por lei',                                         TRUE),
  ('134.º, n.º3',     'Assistência ao cônjuge em consultas médicas e exames de diagnóstico',      TRUE),
  ('42.º do CT',      'Maternidade',                                                               FALSE),
  ('43.º do CT',      'Paternidade',                                                               FALSE),
  ('45.º do CT',      'Adoção',                                                                    FALSE),
  ('46.º do CT',      'Consulta Pré-Natal',                                                        TRUE),
  ('49.º do CT',      'Assistência a filhos menores',                                              TRUE),
  ('50.º do CT',      'Assistência a netos',                                                       TRUE),
  ('Outros',          'Outros motivos / Observações',                                              TRUE)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 2. ESTADOS: adicionar 3 estados ao workflow existente
--    (1-4 já existem; 5-7 específicos para participações)
-- ═══════════════════════════════════════════════════════════════
--
--  Fluxo participação:
--    1 Pendente
--    → [Chefe direto]  2 Validado Superior   (autorização dos serviços)
--    → [Admin RH]      5 Autorizado RH        (análise processual)
--    → [Presidente]    6 Despachado            (decisão final)
--    → [qualquer]      4 Rejeitado / 7 Rejeitado Presidência

INSERT INTO tt_rh_estado_workflow (pk, descr, cor) VALUES
  (5, 'Autorizado RH',            'info'),
  (6, 'Despachado',               'success'),
  (7, 'Rejeitado Presidência',    'error')
ON CONFLICT (pk) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 3. NOVOS EVENTOS DE PONTO
-- ═══════════════════════════════════════════════════════════════

INSERT INTO tt_rh_ponto_evento (pk, descr, ordem) VALUES
  (5, 'Saída Temporária', 5),
  (6, 'Regresso',         6)
ON CONFLICT (pk) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 4. TABELA PRINCIPAL
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tb_rh_participacao (
    pk                      INTEGER     NOT NULL DEFAULT fs_nextcode(),
    tb_user_fk              INTEGER     NOT NULL REFERENCES ts_client(pk),
    ts_rh_falta_motivo_fk   INTEGER     REFERENCES ts_rh_falta_motivo(pk),

    -- tipo: 'dia' = dias completos | 'parcial' = horas dentro de um dia
    tipo                    VARCHAR(10) NOT NULL DEFAULT 'dia'
                              CHECK (tipo IN ('dia', 'parcial')),

    -- Período da ausência
    data_inicio             DATE        NOT NULL,
    data_fim                DATE        NOT NULL,   -- igual a data_inicio para 'parcial'
    hora_inicio             TIME,                   -- obrigatório se tipo='parcial'
    hora_fim                TIME,                   -- obrigatório se tipo='parcial'

    -- Vinculação opcional ao registo de ponto biométrico
    -- Preenchido automaticamente quando o colaborador bate Saída Temporária / Regresso
    ponto_saida_fk          INTEGER,
    ponto_regresso_fk       INTEGER,

    -- Comunicação / pré-aviso
    -- data_participacao: data em que o colaborador comunicou (pode ser backdatada pelo RH)
    -- ts_criado_em: timestamp imutável do sistema para auditoria
    data_participacao       DATE        NOT NULL DEFAULT CURRENT_DATE,
    observacoes             TEXT,

    -- Documentos justificativos: [{nome, path, uploaded_em}]
    documentos              JSONB       NOT NULL DEFAULT '[]',

    -- Workflow — 3 níveis
    ts_estado_fk            INTEGER     NOT NULL DEFAULT 1
                              REFERENCES tt_rh_estado_workflow(pk),

    -- Nível 1: Autorização dos Serviços (chefe direto / supervisor)
    autorizado_servico_por  INTEGER,
    autorizado_servico_em   TIMESTAMP,
    autorizacao_servico_nota TEXT,

    -- Nível 2: Validação RH (processual — ex: verificar documentação)
    autorizado_rh_por       INTEGER,
    autorizado_rh_em        TIMESTAMP,
    autorizacao_rh_nota     TEXT,

    -- Nível 3: Despacho da Presidência (decisão final legal)
    despachado_por          INTEGER,
    despachado_em           TIMESTAMP,
    despacho_nota           TEXT,

    -- Auditoria
    ts_criado_em            TIMESTAMP   NOT NULL DEFAULT NOW(),
    ts_atualizado_em        TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_tb_rh_participacao      PRIMARY KEY (pk),
    CONSTRAINT ck_part_data_fim           CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_part_horas_obrigatorias CHECK (
        tipo = 'dia'
        OR (
            hora_inicio IS NOT NULL
            AND hora_fim IS NOT NULL
            AND hora_fim > hora_inicio
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_rh_part_user   ON tb_rh_participacao(tb_user_fk);
CREATE INDEX IF NOT EXISTS idx_rh_part_datas  ON tb_rh_participacao(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_rh_part_estado ON tb_rh_participacao(ts_estado_fk);

-- Trigger: actualiza ts_atualizado_em automaticamente
CREATE OR REPLACE FUNCTION trg_rh_participacao_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.ts_atualizado_em := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_part_upd ON tb_rh_participacao;
CREATE TRIGGER trg_rh_part_upd
    BEFORE UPDATE ON tb_rh_participacao
    FOR EACH ROW EXECUTE FUNCTION trg_rh_participacao_updated();


-- ═══════════════════════════════════════════════════════════════
-- 5. VIEW DE LEITURA
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vbl_rh_participacao AS
SELECT
    p.pk,
    p.tb_user_fk,
    c.name                                              AS colaborador_nome,
    p.ts_rh_falta_motivo_fk,
    m.artigo                                            AS motivo_artigo,
    m.descricao                                         AS motivo_descricao,
    m.parcial_ok                                        AS motivo_parcial_ok,
    p.tipo,
    p.data_inicio,
    p.data_fim,
    p.hora_inicio,
    p.hora_fim,

    -- Duração calculada
    CASE
        WHEN p.tipo = 'dia'
        THEN (p.data_fim - p.data_inicio + 1)
        ELSE NULL
    END                                                 AS total_dias,
    CASE
        WHEN p.tipo = 'parcial'
             AND p.hora_inicio IS NOT NULL
             AND p.hora_fim    IS NOT NULL
        THEN ROUND(
            EXTRACT(EPOCH FROM (p.hora_fim - p.hora_inicio)) / 3600.0,
            2
        )
        ELSE NULL
    END                                                 AS total_horas,

    -- Pré-aviso
    -- Positivo = comunicou com antecedência (ex: 5 = avisou 5 dias antes)
    -- Zero     = avisou no próprio dia
    -- Negativo = introduzido retroativamente no sistema
    (p.data_inicio - p.data_participacao)               AS pre_aviso_dias,
    CASE
        WHEN (p.data_inicio - p.data_participacao) < 5
        THEN TRUE ELSE FALSE
    END                                                 AS pre_aviso_tardio,

    -- Ponto vinculado
    p.ponto_saida_fk,
    p.ponto_regresso_fk,

    -- Comunicação
    p.data_participacao,
    p.observacoes,
    p.documentos,

    -- Workflow
    p.ts_estado_fk,
    e.descr                                             AS estado_descricao,
    e.cor                                               AS estado_cor,

    -- Autorização dos Serviços
    p.autorizado_servico_por,
    p.autorizado_servico_em,
    p.autorizacao_servico_nota,

    -- Autorização RH
    p.autorizado_rh_por,
    p.autorizado_rh_em,
    p.autorizacao_rh_nota,

    -- Despacho Presidência
    p.despachado_por,
    p.despachado_em,
    p.despacho_nota,

    -- Auditoria
    p.ts_criado_em,
    p.ts_atualizado_em
FROM tb_rh_participacao p
JOIN  ts_client              c ON c.pk = p.tb_user_fk
LEFT JOIN ts_rh_falta_motivo m ON m.pk = p.ts_rh_falta_motivo_fk
JOIN  tt_rh_estado_workflow  e ON e.pk = p.ts_estado_fk;


-- ═══════════════════════════════════════════════════════════════
-- 6. UPSERT: fbo_rh_participacao
--    p_op: 0 = INSERT, 1 = UPDATE
--    Retorna: '<sucess>|pk=N' ou '<error>mensagem'
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fbo_rh_participacao(
    p_op                    SMALLINT,
    p_pk                    INTEGER,
    p_user_fk               INTEGER,
    p_motivo_fk             INTEGER,
    p_tipo                  VARCHAR,
    p_data_inicio           DATE,
    p_data_fim              DATE,
    p_hora_inicio           TIME        DEFAULT NULL,
    p_hora_fim              TIME        DEFAULT NULL,
    p_ponto_saida_fk        INTEGER     DEFAULT NULL,
    p_ponto_regresso_fk     INTEGER     DEFAULT NULL,
    p_data_participacao     DATE        DEFAULT NULL,
    p_observacoes           TEXT        DEFAULT NULL,
    p_documentos            JSONB       DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_pk  INTEGER := p_pk;
    v_tipo VARCHAR;
BEGIN
    v_tipo := LOWER(TRIM(COALESCE(p_tipo, 'dia')));

    -- Validação de horas obrigatórias em ausência parcial
    IF v_tipo = 'parcial' AND (p_hora_inicio IS NULL OR p_hora_fim IS NULL) THEN
        RETURN '<error>Ausência parcial requer hora_inicio e hora_fim</error>';
    END IF;
    IF v_tipo = 'parcial' AND p_hora_fim <= p_hora_inicio THEN
        RETURN '<error>hora_fim deve ser posterior a hora_inicio</error>';
    END IF;
    IF p_data_fim < p_data_inicio THEN
        RETURN '<error>data_fim não pode ser anterior a data_inicio</error>';
    END IF;

    IF p_op = 0 THEN
        -- Verificar sobreposição com férias aprovadas
        IF EXISTS (
            SELECT 1 FROM tb_rh_ferias
            WHERE tb_user_fk  = p_user_fk
              AND ts_estado_fk = 3
              AND data_fim    >= p_data_inicio
              AND data_inicio <= p_data_fim
        ) THEN
            RETURN '<error>Colaborador tem férias aprovadas no período indicado</error>';
        END IF;

        v_pk := fs_nextcode();
        INSERT INTO tb_rh_participacao (
            pk, tb_user_fk, ts_rh_falta_motivo_fk, tipo,
            data_inicio, data_fim, hora_inicio, hora_fim,
            ponto_saida_fk, ponto_regresso_fk,
            data_participacao, observacoes, documentos
        ) VALUES (
            v_pk, p_user_fk, p_motivo_fk, v_tipo,
            p_data_inicio, p_data_fim, p_hora_inicio, p_hora_fim,
            p_ponto_saida_fk, p_ponto_regresso_fk,
            COALESCE(p_data_participacao, CURRENT_DATE),
            p_observacoes,
            COALESCE(p_documentos, '[]')
        );

    ELSIF p_op = 1 THEN
        IF NOT EXISTS (SELECT 1 FROM tb_rh_participacao WHERE pk = v_pk) THEN
            RETURN '<error>Participação não encontrada: ' || v_pk || '</error>';
        END IF;
        -- Apenas permite editar em Pendente (1) ou Validado Superior (2)
        IF NOT EXISTS (
            SELECT 1 FROM tb_rh_participacao
            WHERE pk = v_pk AND ts_estado_fk IN (1, 2)
        ) THEN
            RETURN '<error>Não é possível editar uma participação já aprovada ou rejeitada</error>';
        END IF;

        UPDATE tb_rh_participacao SET
            ts_rh_falta_motivo_fk = COALESCE(p_motivo_fk,         ts_rh_falta_motivo_fk),
            tipo                  = COALESCE(v_tipo,               tipo),
            data_inicio           = COALESCE(p_data_inicio,        data_inicio),
            data_fim              = COALESCE(p_data_fim,           data_fim),
            hora_inicio           = CASE WHEN v_tipo = 'parcial'
                                         THEN COALESCE(p_hora_inicio, hora_inicio)
                                         ELSE NULL END,
            hora_fim              = CASE WHEN v_tipo = 'parcial'
                                         THEN COALESCE(p_hora_fim, hora_fim)
                                         ELSE NULL END,
            ponto_saida_fk        = COALESCE(p_ponto_saida_fk,    ponto_saida_fk),
            ponto_regresso_fk     = COALESCE(p_ponto_regresso_fk,  ponto_regresso_fk),
            -- data_participacao só é alterada se explicitamente fornecida (backdating pelo RH)
            data_participacao     = COALESCE(p_data_participacao,  data_participacao),
            observacoes           = COALESCE(p_observacoes,        observacoes),
            documentos            = COALESCE(p_documentos,         documentos)
        WHERE pk = v_pk;
    ELSE
        RETURN '<error>Operação inválida: ' || p_op || '</error>';
    END IF;

    RETURN '<sucess>|pk=' || v_pk;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- 7. WORKFLOW DE 3 NÍVEIS
--
--  step | quem              | de estado → para estado
--  ─────┼───────────────────┼──────────────────────────────────
--    1  | Chefe direto      | 1 Pendente     → 2 Validado Superior
--       |                   | 1 Pendente     → 4 Rejeitado
--    2  | Admin RH          | 2 Val. Superior→ 5 Autorizado RH
--       |                   | 2 Val. Superior→ 4 Rejeitado
--    3  | Presidente        | 5 Aut. RH      → 6 Despachado
--       |                   | 5 Aut. RH      → 7 Rejeitado Presidência
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fbo_rh_participacao_wf(
    p_pk            INTEGER,
    p_step          SMALLINT,   -- 1=Chefe, 2=RH, 3=Presidente
    p_user_fk       INTEGER,    -- utilizador que executa a acção
    p_ts_estado_fk  INTEGER,    -- estado destino
    p_notas         TEXT        DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_estado_atual  INTEGER;
    v_user_ref      INTEGER;
    v_wf_pk         INTEGER;
BEGIN
    SELECT ts_estado_fk, tb_user_fk
    INTO   v_estado_atual, v_user_ref
    FROM   tb_rh_participacao
    WHERE  pk = p_pk;

    IF v_user_ref IS NULL THEN
        RETURN '<error>Participação não encontrada: ' || p_pk || '</error>';
    END IF;

    -- Validar transições permitidas por step
    IF p_step = 1 THEN
        IF v_estado_atual != 1 THEN
            RETURN '<error>Chefe só pode actuar em estado Pendente</error>';
        END IF;
        IF p_ts_estado_fk NOT IN (2, 4) THEN
            RETURN '<error>Estado inválido para step 1 (Chefe). Use 2=Validar ou 4=Rejeitar</error>';
        END IF;
        UPDATE tb_rh_participacao SET
            ts_estado_fk           = p_ts_estado_fk,
            autorizado_servico_por = p_user_fk,
            autorizado_servico_em  = NOW(),
            autorizacao_servico_nota = p_notas
        WHERE pk = p_pk;

    ELSIF p_step = 2 THEN
        IF v_estado_atual != 2 THEN
            RETURN '<error>Admin RH só pode actuar em estado Validado Superior</error>';
        END IF;
        IF p_ts_estado_fk NOT IN (5, 4) THEN
            RETURN '<error>Estado inválido para step 2 (RH). Use 5=Autorizar ou 4=Rejeitar</error>';
        END IF;
        UPDATE tb_rh_participacao SET
            ts_estado_fk       = p_ts_estado_fk,
            autorizado_rh_por  = p_user_fk,
            autorizado_rh_em   = NOW(),
            autorizacao_rh_nota = p_notas
        WHERE pk = p_pk;

    ELSIF p_step = 3 THEN
        IF v_estado_atual != 5 THEN
            RETURN '<error>Presidência só pode actuar em estado Autorizado RH</error>';
        END IF;
        IF p_ts_estado_fk NOT IN (6, 7) THEN
            RETURN '<error>Estado inválido para step 3 (Presidência). Use 6=Despachar ou 7=Rejeitar</error>';
        END IF;
        UPDATE tb_rh_participacao SET
            ts_estado_fk   = p_ts_estado_fk,
            despachado_por = p_user_fk,
            despachado_em  = NOW(),
            despacho_nota  = p_notas
        WHERE pk = p_pk;
    ELSE
        RETURN '<error>Step inválido: ' || p_step || '</error>';
    END IF;

    -- Registo de auditoria no tb_rh_workflow existente
    v_wf_pk := fs_nextcode();
    INSERT INTO tb_rh_workflow (pk, tipo_ref, ref_pk, step, tb_user_fk, ts_estado_fk, notas)
    VALUES (v_wf_pk, 'participacao', p_pk, p_step, p_user_fk, p_ts_estado_fk, p_notas);

    RETURN '<sucess>|pk=' || v_wf_pk;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- NOTA SOBRE PRÉ-AVISO E BACKDATING
-- ═══════════════════════════════════════════════════════════════
--
-- A lei exige 5 dias de pré-aviso para faltas previsíveis.
-- Muitos colaboradores avisam no próprio dia (pre_aviso_dias = 0)
-- ou até retroativamente (negativo).
--
-- O sistema NÃO BLOQUEIA registos tardios — regista e sinaliza.
-- O campo data_participacao pode ser alterado pelo Admin RH para
-- reflectir a data real de comunicação (ex: por telefone ou pessoalmente),
-- enquanto ts_criado_em regista o momento exacto de entrada no sistema.
--
-- pre_aviso_tardio = TRUE quando pre_aviso_dias < 5 (visível na view).
