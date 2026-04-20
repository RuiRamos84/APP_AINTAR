-- ============================================================
-- AINTAR — Website CMS
-- Data: 2026-04-17
--
-- Tabelas de conteúdo público do website www.aintar.pt
--
-- Padrão:
--   ts_* → tabelas de lookup (tipos, estados)
--   tb_* → tabelas de dados
--   vbl_* → views de leitura (com JOINs e labels)
--   vbf_* → views de escrita (updatable, 1:1 com tb_*)
--   fbf_*(pop, pnpk, ...) → funções upsert (pop=0 INSERT, pop=1 UPDATE)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABELAS DE LOOKUP (ts_*)
-- ============================================================

-- Notícias: estados
CREATE TABLE ts_site_noticia_estado (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);
INSERT INTO ts_site_noticia_estado VALUES
    (1, 'Rascunho'),
    (2, 'Publicado'),
    (3, 'Arquivado');

-- Notícias: categorias
CREATE TABLE ts_site_noticia_categoria (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);
INSERT INTO ts_site_noticia_categoria VALUES
    (1, 'Comunicado'),
    (2, 'Infraestruturas'),
    (3, 'Operação'),
    (4, 'Institucional'),
    (5, 'Projetos');

-- Publicações: tipos
CREATE TABLE ts_site_publicacao_tipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);
INSERT INTO ts_site_publicacao_tipo VALUES
    (1, 'Edital'),
    (2, 'Aviso DR'),
    (3, 'Tolerância de Ponto'),
    (4, 'Outro');

-- Publicações: subtipos (usado em Tolerâncias de Ponto)
CREATE TABLE ts_site_publicacao_subtipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);
INSERT INTO ts_site_publicacao_subtipo VALUES
    (1, 'Carnaval'),
    (2, 'Páscoa'),
    (3, 'Natal e Fim de Ano'),
    (4, 'Outro');

-- Documentos: categorias
CREATE TABLE ts_site_documento_categoria (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);
INSERT INTO ts_site_documento_categoria VALUES
    (1, 'Formulários'),
    (2, 'Regulamentação'),
    (3, 'Tarifário'),
    (4, 'Relatórios'),
    (5, 'Outro');

-- Procedimentos RH: tipos
CREATE TABLE ts_site_procedimento_tipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);
INSERT INTO ts_site_procedimento_tipo VALUES
    (1, 'Concurso Externo'),
    (2, 'Mobilidade Intercarreiras'),
    (3, 'Estágio');

-- Procedimentos RH: estados
CREATE TABLE ts_site_procedimento_estado (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);
INSERT INTO ts_site_procedimento_estado VALUES
    (1, 'Aberto'),
    (2, 'Em Análise'),
    (3, 'Homologado'),
    (4, 'Encerrado'),
    (5, 'Deserto');

-- Procedimentos RH: tipos de fase
CREATE TABLE ts_site_procedimento_fase_tipo (
    pk    SMALLINT PRIMARY KEY,
    name  VARCHAR(80) NOT NULL,
    ordem SMALLINT DEFAULT 0
);
INSERT INTO ts_site_procedimento_fase_tipo VALUES
    (1, 'Abertura',                       1),
    (2, 'Lista de Admitidos/Excluídos',   2),
    (3, 'Audiência Prévia',               3),
    (4, 'Resultado de Audiência Prévia',  4),
    (5, 'Classificação Final',            5),
    (6, 'Homologação',                    6),
    (7, 'Outro',                         99);

-- Processos financeiros: tipos
CREATE TABLE ts_site_processo_financeiro_tipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);
INSERT INTO ts_site_processo_financeiro_tipo VALUES
    (1, 'Orçamento'),
    (2, 'Relatório de Gestão e Contas'),
    (3, 'Prestação de Contas'),
    (4, 'Execução Orçamental'),
    (5, 'Plano de Atividades'),
    (6, 'Relatório de Atividades'),
    (7, 'Plano de Contratação Pública');

-- Processos financeiros: estados
CREATE TABLE ts_site_processo_financeiro_estado (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(30) NOT NULL
);
INSERT INTO ts_site_processo_financeiro_estado VALUES
    (1, 'Em Elaboração'),
    (2, 'Provisório'),
    (3, 'Aprovado'),
    (4, 'Homologado'),
    (5, 'Publicado');

-- Documentos de processos financeiros: tipos
CREATE TABLE ts_site_processo_financeiro_doc_tipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(80) NOT NULL
);
INSERT INTO ts_site_processo_financeiro_doc_tipo VALUES
    (1,  'Proposta de Orçamento'),
    (2,  'Orçamento Aprovado'),
    (3,  'Revisão Orçamental'),
    (4,  'Relatório de Gestão'),
    (5,  'Balanço'),
    (6,  'Demonstração de Resultados'),
    (7,  'Notas às Contas'),
    (8,  'Parecer do Fiscal Único'),
    (9,  'Ata de Aprovação'),
    (10, 'Mapa de Execução'),
    (11, 'Outro');

-- Alertas: tipos
CREATE TABLE ts_site_alerta_tipo (
    pk   SMALLINT PRIMARY KEY,
    name VARCHAR(20) NOT NULL
);
INSERT INTO ts_site_alerta_tipo VALUES
    (1, 'info'),
    (2, 'aviso'),
    (3, 'urgente');


-- ============================================================
-- 2. TABELAS DE DADOS (tb_*)
-- ============================================================

-- Notícias e comunicados
CREATE TABLE tb_site_noticia (
    pk              INTEGER  PRIMARY KEY,
    titulo          VARCHAR(300) NOT NULL,
    resumo          VARCHAR(500),
    conteudo_html   TEXT,
    ts_categoria    SMALLINT REFERENCES ts_site_noticia_categoria(pk),
    imagem_url      VARCHAR(500),
    destaque        BOOLEAN  DEFAULT FALSE,
    ts_estado       SMALLINT NOT NULL DEFAULT 1
                    REFERENCES ts_site_noticia_estado(pk),
    data_publicacao TIMESTAMP,
    data_criacao    TIMESTAMP DEFAULT NOW(),
    criado_por      INTEGER  REFERENCES ts_client(pk)
);

-- Publicações oficiais (editais + tolerâncias de ponto)
-- publicacao_pai: self-reference para retificações/aditamentos
CREATE TABLE tb_site_publicacao (
    pk              INTEGER  PRIMARY KEY,
    titulo          VARCHAR(300) NOT NULL,
    ts_tipo         SMALLINT NOT NULL REFERENCES ts_site_publicacao_tipo(pk),
    ts_subtipo      SMALLINT REFERENCES ts_site_publicacao_subtipo(pk),
    numero          VARCHAR(20),           -- ex: "002/2026", "5728/2023"
    ano             SMALLINT NOT NULL,
    data_publicacao DATE     NOT NULL,
    referencia_dr   VARCHAR(100),          -- ex: "Diário da República, 2.ª série"
    ficheiro_url    VARCHAR(500),
    e_retificacao   BOOLEAN  DEFAULT FALSE,
    publicacao_pai  INTEGER  REFERENCES tb_site_publicacao(pk),
    ativo           BOOLEAN  DEFAULT TRUE,
    data_criacao    TIMESTAMP DEFAULT NOW(),
    criado_por      INTEGER  REFERENCES ts_client(pk)
);

-- Documentos gerais para download (formulários, regulamentos, tarifários)
CREATE TABLE tb_site_documento (
    pk              INTEGER  PRIMARY KEY,
    titulo          VARCHAR(300) NOT NULL,
    descricao       TEXT,
    ts_categoria    SMALLINT NOT NULL REFERENCES ts_site_documento_categoria(pk),
    subcategoria    VARCHAR(100),
    ano             SMALLINT,
    ficheiro_url    VARCHAR(500),
    ordem           SMALLINT DEFAULT 0,
    ativo           BOOLEAN  DEFAULT TRUE,
    data_criacao    TIMESTAMP DEFAULT NOW(),
    criado_por      INTEGER  REFERENCES ts_client(pk)
);

-- Procedimentos RH — cabeçalho
CREATE TABLE tb_site_procedimento (
    pk                INTEGER  PRIMARY KEY,
    referencia        VARCHAR(20) NOT NULL,   -- ex: "A/2026", "MIC-01/2025"
    ts_tipo           SMALLINT NOT NULL REFERENCES ts_site_procedimento_tipo(pk),
    titulo            VARCHAR(300) NOT NULL,  -- ex: "Assistente Técnico"
    carreira          VARCHAR(100),
    categoria_prof    VARCHAR(100),
    num_vagas         SMALLINT,
    municipio         VARCHAR(100),
    ts_estado         SMALLINT NOT NULL DEFAULT 1
                      REFERENCES ts_site_procedimento_estado(pk),
    descricao         TEXT,
    data_abertura     DATE,
    data_encerramento DATE,
    visivel           BOOLEAN  DEFAULT TRUE,
    data_criacao      TIMESTAMP DEFAULT NOW(),
    criado_por        INTEGER  REFERENCES ts_client(pk)
);

-- Procedimentos RH — fases
-- Cada procedimento tem N fases ordenadas
CREATE TABLE tb_site_procedimento_fase (
    pk              INTEGER  PRIMARY KEY,
    procedimento_fk INTEGER  NOT NULL
                    REFERENCES tb_site_procedimento(pk) ON DELETE CASCADE,
    ts_tipo_fase    SMALLINT NOT NULL
                    REFERENCES ts_site_procedimento_fase_tipo(pk),
    label_custom    VARCHAR(100),           -- substituí tipo_fase se preenchido
    data            DATE,
    ficheiro_url    VARCHAR(500),
    notas           TEXT,
    publicado       BOOLEAN  DEFAULT FALSE,
    ordem           SMALLINT DEFAULT 0
);

-- Processos financeiros — cabeçalho
-- ex: "Relatório de Gestão e Contas 2025", "Orçamento 2026"
CREATE TABLE tb_site_processo_financeiro (
    pk              INTEGER  PRIMARY KEY,
    ts_tipo         SMALLINT NOT NULL
                    REFERENCES ts_site_processo_financeiro_tipo(pk),
    ano_exercicio   SMALLINT NOT NULL,
    titulo          VARCHAR(300),           -- gerado auto se NULL (tipo + ano)
    descricao       TEXT,
    ts_estado       SMALLINT NOT NULL DEFAULT 1
                    REFERENCES ts_site_processo_financeiro_estado(pk),
    visivel         BOOLEAN  DEFAULT FALSE, -- só aparece no site quando TRUE
    data_criacao    TIMESTAMP DEFAULT NOW(),
    criado_por      INTEGER  REFERENCES ts_client(pk)
);

-- Processos financeiros — documentos individuais
-- ex: Balanço (provisório), Relatório de Gestão (definitivo)
CREATE TABLE tb_site_processo_financeiro_doc (
    pk              INTEGER  PRIMARY KEY,
    processo_fk     INTEGER  NOT NULL
                    REFERENCES tb_site_processo_financeiro(pk) ON DELETE CASCADE,
    ts_tipo_doc     SMALLINT REFERENCES ts_site_processo_financeiro_doc_tipo(pk),
    titulo          VARCHAR(300) NOT NULL,
    provisorio      BOOLEAN  DEFAULT FALSE,  -- versão provisória?
    ficheiro_url    VARCHAR(500),
    data_publicacao DATE,
    ordem           SMALLINT DEFAULT 0,
    publicado       BOOLEAN  DEFAULT FALSE   -- visível no site?
);

-- Alertas/avisos no site público
CREATE TABLE tb_site_alerta (
    pk          INTEGER  PRIMARY KEY,
    mensagem    TEXT     NOT NULL,
    ts_tipo     SMALLINT NOT NULL DEFAULT 1 REFERENCES ts_site_alerta_tipo(pk),
    ativo       BOOLEAN  DEFAULT TRUE,
    data_inicio DATE,
    data_fim    DATE     -- NULL = sem expiração
);


-- ============================================================
-- 3. VIEWS DE LEITURA (vbl_*)
--    Incluem JOINs para obter labels dos lookups
-- ============================================================

-- Notícias
CREATE OR REPLACE VIEW vbl_site_noticia AS
SELECT
    n.pk,
    n.titulo,
    n.resumo,
    n.conteudo_html,
    n.ts_categoria,
    c.name          AS categoria,
    n.imagem_url,
    n.destaque,
    n.ts_estado,
    e.name          AS estado,
    n.data_publicacao,
    n.data_criacao,
    n.criado_por
FROM tb_site_noticia n
LEFT JOIN ts_site_noticia_categoria c ON c.pk = n.ts_categoria
LEFT JOIN ts_site_noticia_estado    e ON e.pk = n.ts_estado;

-- Publicações
CREATE OR REPLACE VIEW vbl_site_publicacao AS
SELECT
    p.pk,
    p.titulo,
    p.ts_tipo,
    t.name          AS tipo,
    p.ts_subtipo,
    s.name          AS subtipo,
    p.numero,
    p.ano,
    p.data_publicacao,
    p.referencia_dr,
    p.ficheiro_url,
    p.e_retificacao,
    p.publicacao_pai,
    pai.titulo      AS titulo_pai,
    p.ativo,
    p.data_criacao
FROM tb_site_publicacao p
LEFT JOIN ts_site_publicacao_tipo    t   ON t.pk   = p.ts_tipo
LEFT JOIN ts_site_publicacao_subtipo s   ON s.pk   = p.ts_subtipo
LEFT JOIN tb_site_publicacao         pai ON pai.pk = p.publicacao_pai;

-- Documentos gerais
CREATE OR REPLACE VIEW vbl_site_documento AS
SELECT
    d.pk,
    d.titulo,
    d.descricao,
    d.ts_categoria,
    c.name          AS categoria,
    d.subcategoria,
    d.ano,
    d.ficheiro_url,
    d.ordem,
    d.ativo,
    d.data_criacao
FROM tb_site_documento d
LEFT JOIN ts_site_documento_categoria c ON c.pk = d.ts_categoria;

-- Procedimentos RH — cabeçalho
-- Inclui contagem de fases e data da última fase publicada
CREATE OR REPLACE VIEW vbl_site_procedimento AS
SELECT
    p.pk,
    p.referencia,
    p.ts_tipo,
    t.name          AS tipo,
    p.titulo,
    p.carreira,
    p.categoria_prof,
    p.num_vagas,
    p.municipio,
    p.ts_estado,
    e.name          AS estado,
    p.descricao,
    p.data_abertura,
    p.data_encerramento,
    p.visivel,
    p.data_criacao,
    (SELECT COUNT(*)
     FROM tb_site_procedimento_fase f
     WHERE f.procedimento_fk = p.pk)                          AS num_fases,
    (SELECT MAX(f.data)
     FROM tb_site_procedimento_fase f
     WHERE f.procedimento_fk = p.pk AND f.publicado = TRUE)  AS ultima_fase_data,
    (SELECT tf.name
     FROM tb_site_procedimento_fase f
     JOIN ts_site_procedimento_fase_tipo tf ON tf.pk = f.ts_tipo_fase
     WHERE f.procedimento_fk = p.pk AND f.publicado = TRUE
     ORDER BY f.ordem DESC LIMIT 1)                           AS ultima_fase_nome
FROM tb_site_procedimento p
LEFT JOIN ts_site_procedimento_tipo   t ON t.pk = p.ts_tipo
LEFT JOIN ts_site_procedimento_estado e ON e.pk = p.ts_estado;

-- Procedimentos RH — fases
CREATE OR REPLACE VIEW vbl_site_procedimento_fase AS
SELECT
    f.pk,
    f.procedimento_fk,
    p.referencia        AS procedimento_ref,
    p.titulo            AS procedimento_titulo,
    f.ts_tipo_fase,
    tf.name             AS tipo_fase,
    f.label_custom,
    COALESCE(f.label_custom, tf.name) AS label,
    f.data,
    f.ficheiro_url,
    f.notas,
    f.publicado,
    f.ordem
FROM tb_site_procedimento_fase f
LEFT JOIN ts_site_procedimento_fase_tipo tf ON tf.pk  = f.ts_tipo_fase
LEFT JOIN tb_site_procedimento           p  ON p.pk   = f.procedimento_fk;

-- Processos financeiros — cabeçalho
-- Título gerado automaticamente se não preenchido (tipo + ano)
-- Contagem de documentos totais vs publicados
CREATE OR REPLACE VIEW vbl_site_processo_financeiro AS
SELECT
    pf.pk,
    pf.ts_tipo,
    t.name              AS tipo,
    pf.ano_exercicio,
    COALESCE(pf.titulo, t.name || ' ' || pf.ano_exercicio::TEXT) AS titulo,
    pf.descricao,
    pf.ts_estado,
    e.name              AS estado,
    pf.visivel,
    pf.data_criacao,
    (SELECT COUNT(*)
     FROM tb_site_processo_financeiro_doc d
     WHERE d.processo_fk = pf.pk)                           AS num_documentos,
    (SELECT COUNT(*)
     FROM tb_site_processo_financeiro_doc d
     WHERE d.processo_fk = pf.pk AND d.publicado = TRUE)   AS num_publicados,
    (SELECT BOOL_OR(d.provisorio)
     FROM tb_site_processo_financeiro_doc d
     WHERE d.processo_fk = pf.pk AND d.publicado = TRUE)   AS tem_provisorios
FROM tb_site_processo_financeiro pf
LEFT JOIN ts_site_processo_financeiro_tipo   t ON t.pk = pf.ts_tipo
LEFT JOIN ts_site_processo_financeiro_estado e ON e.pk = pf.ts_estado;

-- Processos financeiros — documentos
CREATE OR REPLACE VIEW vbl_site_processo_financeiro_doc AS
SELECT
    d.pk,
    d.processo_fk,
    pf.tipo             AS processo_tipo,
    pf.titulo           AS processo_titulo,
    pf.ano_exercicio,
    d.ts_tipo_doc,
    td.name             AS tipo_doc,
    d.titulo,
    d.provisorio,
    d.ficheiro_url,
    d.data_publicacao,
    d.ordem,
    d.publicado
FROM tb_site_processo_financeiro_doc d
LEFT JOIN ts_site_processo_financeiro_doc_tipo td ON td.pk = d.ts_tipo_doc
LEFT JOIN vbl_site_processo_financeiro         pf ON pf.pk = d.processo_fk;

-- Alertas
-- Coluna calculada ativo_agora: considera datas de início/fim
CREATE OR REPLACE VIEW vbl_site_alerta AS
SELECT
    a.pk,
    a.mensagem,
    a.ts_tipo,
    t.name  AS tipo,
    a.ativo,
    a.data_inicio,
    a.data_fim,
    CASE
        WHEN a.ativo = FALSE                              THEN FALSE
        WHEN a.data_fim   IS NOT NULL
         AND a.data_fim   < CURRENT_DATE                 THEN FALSE
        WHEN a.data_inicio IS NOT NULL
         AND a.data_inicio > CURRENT_DATE                THEN FALSE
        ELSE TRUE
    END AS ativo_agora
FROM tb_site_alerta a
LEFT JOIN ts_site_alerta_tipo t ON t.pk = a.ts_tipo;


-- ============================================================
-- 4. VIEWS DE ESCRITA (vbf_*)
--    Simples SELECT * FROM tb_* — auto-updatable no PostgreSQL
--    Usadas para UPDATE e DELETE diretos (ex: mudar estado)
-- ============================================================

CREATE OR REPLACE VIEW vbf_site_noticia AS
    SELECT * FROM tb_site_noticia;

CREATE OR REPLACE VIEW vbf_site_publicacao AS
    SELECT * FROM tb_site_publicacao;

CREATE OR REPLACE VIEW vbf_site_documento AS
    SELECT * FROM tb_site_documento;

CREATE OR REPLACE VIEW vbf_site_procedimento AS
    SELECT * FROM tb_site_procedimento;

CREATE OR REPLACE VIEW vbf_site_procedimento_fase AS
    SELECT * FROM tb_site_procedimento_fase;

CREATE OR REPLACE VIEW vbf_site_processo_financeiro AS
    SELECT * FROM tb_site_processo_financeiro;

CREATE OR REPLACE VIEW vbf_site_processo_financeiro_doc AS
    SELECT * FROM tb_site_processo_financeiro_doc;

CREATE OR REPLACE VIEW vbf_site_alerta AS
    SELECT * FROM tb_site_alerta;


-- ============================================================
-- 5. FUNÇÕES UPSERT (fbf_*)
--    pop = 0 → INSERT
--    pop = 1 → UPDATE (COALESCE preserva valores existentes)
--    Retorna o pk do registo criado/atualizado
-- ============================================================

-- fbf_site_noticia
CREATE OR REPLACE FUNCTION fbf_site_noticia(
    pop             SMALLINT,
    pnpk            INTEGER,
    pntitulo        VARCHAR,
    pnresumo        VARCHAR,
    pnconteudo      TEXT,
    pncategoria     SMALLINT,
    pnimagem_url    VARCHAR,
    pndestaque      BOOLEAN,
    pnestado        SMALLINT,
    pndata_pub      TIMESTAMP,
    pncriado_por    INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_noticia (
            pk, titulo, resumo, conteudo_html, ts_categoria,
            imagem_url, destaque, ts_estado, data_publicacao, criado_por
        ) VALUES (
            pnpk, pntitulo, pnresumo, pnconteudo, pncategoria,
            pnimagem_url, pndestaque, pnestado, pndata_pub, pncriado_por
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_noticia SET
            titulo          = COALESCE(pntitulo,     titulo),
            resumo          = COALESCE(pnresumo,     resumo),
            conteudo_html   = COALESCE(pnconteudo,   conteudo_html),
            ts_categoria    = COALESCE(pncategoria,  ts_categoria),
            imagem_url      = COALESCE(pnimagem_url, imagem_url),
            destaque        = COALESCE(pndestaque,   destaque),
            ts_estado       = COALESCE(pnestado,     ts_estado),
            data_publicacao = COALESCE(pndata_pub,   data_publicacao)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_publicacao
CREATE OR REPLACE FUNCTION fbf_site_publicacao(
    pop              SMALLINT,
    pnpk             INTEGER,
    pntitulo         VARCHAR,
    pnts_tipo        SMALLINT,
    pnts_subtipo     SMALLINT,
    pnnumero         VARCHAR,
    pnano            SMALLINT,
    pndata_pub       DATE,
    pnreferencia_dr  VARCHAR,
    pnficheiro_url   VARCHAR,
    pne_retificacao  BOOLEAN,
    pnpublicacao_pai INTEGER,
    pnativo          BOOLEAN,
    pncriado_por     INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_publicacao (
            pk, titulo, ts_tipo, ts_subtipo, numero, ano,
            data_publicacao, referencia_dr, ficheiro_url,
            e_retificacao, publicacao_pai, ativo, criado_por
        ) VALUES (
            pnpk, pntitulo, pnts_tipo, pnts_subtipo, pnnumero, pnano,
            pndata_pub, pnreferencia_dr, pnficheiro_url,
            pne_retificacao, pnpublicacao_pai, pnativo, pncriado_por
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_publicacao SET
            titulo          = COALESCE(pntitulo,         titulo),
            ts_tipo         = COALESCE(pnts_tipo,        ts_tipo),
            ts_subtipo      = COALESCE(pnts_subtipo,     ts_subtipo),
            numero          = COALESCE(pnnumero,         numero),
            ano             = COALESCE(pnano,            ano),
            data_publicacao = COALESCE(pndata_pub,       data_publicacao),
            referencia_dr   = COALESCE(pnreferencia_dr,  referencia_dr),
            ficheiro_url    = COALESCE(pnficheiro_url,   ficheiro_url),
            e_retificacao   = COALESCE(pne_retificacao,  e_retificacao),
            publicacao_pai  = COALESCE(pnpublicacao_pai, publicacao_pai),
            ativo           = COALESCE(pnativo,          ativo)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_documento
CREATE OR REPLACE FUNCTION fbf_site_documento(
    pop             SMALLINT,
    pnpk            INTEGER,
    pntitulo        VARCHAR,
    pndescricao     TEXT,
    pncategoria     SMALLINT,
    pnsubcategoria  VARCHAR,
    pnano           SMALLINT,
    pnficheiro_url  VARCHAR,
    pnordem         SMALLINT,
    pnativo         BOOLEAN,
    pncriado_por    INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_documento (
            pk, titulo, descricao, ts_categoria, subcategoria,
            ano, ficheiro_url, ordem, ativo, criado_por
        ) VALUES (
            pnpk, pntitulo, pndescricao, pncategoria, pnsubcategoria,
            pnano, pnficheiro_url, pnordem, pnativo, pncriado_por
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_documento SET
            titulo        = COALESCE(pntitulo,       titulo),
            descricao     = COALESCE(pndescricao,    descricao),
            ts_categoria  = COALESCE(pncategoria,    ts_categoria),
            subcategoria  = COALESCE(pnsubcategoria, subcategoria),
            ano           = COALESCE(pnano,          ano),
            ficheiro_url  = COALESCE(pnficheiro_url, ficheiro_url),
            ordem         = COALESCE(pnordem,        ordem),
            ativo         = COALESCE(pnativo,        ativo)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_procedimento
CREATE OR REPLACE FUNCTION fbf_site_procedimento(
    pop               SMALLINT,
    pnpk              INTEGER,
    pnreferencia      VARCHAR,
    pnts_tipo         SMALLINT,
    pntitulo          VARCHAR,
    pncarreira        VARCHAR,
    pncategoria_prof  VARCHAR,
    pnnum_vagas       SMALLINT,
    pnmunicipio       VARCHAR,
    pnts_estado       SMALLINT,
    pndescricao       TEXT,
    pndata_abertura   DATE,
    pndata_enc        DATE,
    pnvisivel         BOOLEAN,
    pncriado_por      INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_procedimento (
            pk, referencia, ts_tipo, titulo, carreira, categoria_prof,
            num_vagas, municipio, ts_estado, descricao,
            data_abertura, data_encerramento, visivel, criado_por
        ) VALUES (
            pnpk, pnreferencia, pnts_tipo, pntitulo, pncarreira, pncategoria_prof,
            pnnum_vagas, pnmunicipio, pnts_estado, pndescricao,
            pndata_abertura, pndata_enc, pnvisivel, pncriado_por
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_procedimento SET
            referencia        = COALESCE(pnreferencia,     referencia),
            ts_tipo           = COALESCE(pnts_tipo,        ts_tipo),
            titulo            = COALESCE(pntitulo,         titulo),
            carreira          = COALESCE(pncarreira,       carreira),
            categoria_prof    = COALESCE(pncategoria_prof, categoria_prof),
            num_vagas         = COALESCE(pnnum_vagas,      num_vagas),
            municipio         = COALESCE(pnmunicipio,      municipio),
            ts_estado         = COALESCE(pnts_estado,      ts_estado),
            descricao         = COALESCE(pndescricao,      descricao),
            data_abertura     = COALESCE(pndata_abertura,  data_abertura),
            data_encerramento = COALESCE(pndata_enc,       data_encerramento),
            visivel           = COALESCE(pnvisivel,        visivel)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_procedimento_fase
CREATE OR REPLACE FUNCTION fbf_site_procedimento_fase(
    pop             SMALLINT,
    pnpk            INTEGER,
    pnprocedimento  INTEGER,
    pnts_tipo_fase  SMALLINT,
    pnlabel_custom  VARCHAR,
    pndata          DATE,
    pnficheiro_url  VARCHAR,
    pnnotas         TEXT,
    pnpublicado     BOOLEAN,
    pnordem         SMALLINT
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_procedimento_fase (
            pk, procedimento_fk, ts_tipo_fase, label_custom,
            data, ficheiro_url, notas, publicado, ordem
        ) VALUES (
            pnpk, pnprocedimento, pnts_tipo_fase, pnlabel_custom,
            pndata, pnficheiro_url, pnnotas, pnpublicado, pnordem
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_procedimento_fase SET
            ts_tipo_fase  = COALESCE(pnts_tipo_fase, ts_tipo_fase),
            label_custom  = COALESCE(pnlabel_custom, label_custom),
            data          = COALESCE(pndata,         data),
            ficheiro_url  = COALESCE(pnficheiro_url, ficheiro_url),
            notas         = COALESCE(pnnotas,        notas),
            publicado     = COALESCE(pnpublicado,    publicado),
            ordem         = COALESCE(pnordem,        ordem)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_processo_financeiro
CREATE OR REPLACE FUNCTION fbf_site_processo_financeiro(
    pop           SMALLINT,
    pnpk          INTEGER,
    pnts_tipo     SMALLINT,
    pnano         SMALLINT,
    pntitulo      VARCHAR,
    pndescricao   TEXT,
    pnts_estado   SMALLINT,
    pnvisivel     BOOLEAN,
    pncriado_por  INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_processo_financeiro (
            pk, ts_tipo, ano_exercicio, titulo,
            descricao, ts_estado, visivel, criado_por
        ) VALUES (
            pnpk, pnts_tipo, pnano, pntitulo,
            pndescricao, pnts_estado, pnvisivel, pncriado_por
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_processo_financeiro SET
            ts_tipo       = COALESCE(pnts_tipo,   ts_tipo),
            ano_exercicio = COALESCE(pnano,        ano_exercicio),
            titulo        = COALESCE(pntitulo,     titulo),
            descricao     = COALESCE(pndescricao,  descricao),
            ts_estado     = COALESCE(pnts_estado,  ts_estado),
            visivel       = COALESCE(pnvisivel,    visivel)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_processo_financeiro_doc
CREATE OR REPLACE FUNCTION fbf_site_processo_financeiro_doc(
    pop             SMALLINT,
    pnpk            INTEGER,
    pnprocesso_fk   INTEGER,
    pnts_tipo_doc   SMALLINT,
    pntitulo        VARCHAR,
    pnprovisorio    BOOLEAN,
    pnficheiro_url  VARCHAR,
    pndata_pub      DATE,
    pnordem         SMALLINT,
    pnpublicado     BOOLEAN
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_processo_financeiro_doc (
            pk, processo_fk, ts_tipo_doc, titulo,
            provisorio, ficheiro_url, data_publicacao, ordem, publicado
        ) VALUES (
            pnpk, pnprocesso_fk, pnts_tipo_doc, pntitulo,
            pnprovisorio, pnficheiro_url, pndata_pub, pnordem, pnpublicado
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_processo_financeiro_doc SET
            ts_tipo_doc     = COALESCE(pnts_tipo_doc,  ts_tipo_doc),
            titulo          = COALESCE(pntitulo,        titulo),
            provisorio      = COALESCE(pnprovisorio,    provisorio),
            ficheiro_url    = COALESCE(pnficheiro_url,  ficheiro_url),
            data_publicacao = COALESCE(pndata_pub,      data_publicacao),
            ordem           = COALESCE(pnordem,         ordem),
            publicado       = COALESCE(pnpublicado,     publicado)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;

-- fbf_site_alerta
CREATE OR REPLACE FUNCTION fbf_site_alerta(
    pop           SMALLINT,
    pnpk          INTEGER,
    pnmensagem    TEXT,
    pnts_tipo     SMALLINT,
    pnativo       BOOLEAN,
    pndata_inicio DATE,
    pndata_fim    DATE
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_site_alerta (
            pk, mensagem, ts_tipo, ativo, data_inicio, data_fim
        ) VALUES (
            pnpk, pnmensagem, pnts_tipo, pnativo, pndata_inicio, pndata_fim
        );
    ELSIF pop = 1 THEN
        UPDATE tb_site_alerta SET
            mensagem    = COALESCE(pnmensagem,    mensagem),
            ts_tipo     = COALESCE(pnts_tipo,     ts_tipo),
            ativo       = COALESCE(pnativo,       ativo),
            data_inicio = COALESCE(pndata_inicio, data_inicio),
            data_fim    = COALESCE(pndata_fim,    data_fim)
        WHERE pk = pnpk;
    END IF;
    RETURN pnpk;
END;
$$;


-- ============================================================
-- 6. PERMISSÕES (ts_interface)
--    website.view → ver conteúdos no backoffice
--    website.edit → criar, editar e publicar conteúdos
-- ============================================================
INSERT INTO ts_interface (
    pk, value, category, label, description, icon, requires, sort_order, groups
) VALUES
    (930, 'website.view', 'Website', 'Visualizar Website', 'Ver conteúdos do website no backoffice', 'public', NULL, 930, ARRAY['Internos']),
    (931, 'website.edit', 'Website', 'Gerir Website', 'Criar e editar conteúdos do website', 'edit', ARRAY[930], 931, ARRAY['Internos']);
COMMIT;

-- ============================================================
-- VERIFICAÇÃO (executar separadamente após migration)
-- ============================================================

-- Listar todas as tabelas criadas
 SELECT tablename FROM pg_tables
 WHERE  tablename LIKE '%site%'
 ORDER BY tablename;

-- Listar todas as views criadas
SELECT viewname FROM pg_views
WHERE viewname LIKE '%site%'
ORDER BY viewname;

-- Listar todas as funções criadas
SELECT proname FROM pg_proc
WHERE proname LIKE 'fbf_site%'
ORDER BY proname;