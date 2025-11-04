-- ====================================================================
-- Template de Ofício AINTAR - Baseado em Exemplo Real
-- ====================================================================
-- Este script cria um template completo para ofícios da AINTAR
-- com header (logo), body (conteúdo) e footer (dados da entidade)

-- Template: Ofício - Autorização de Ligação (AINTAR)
SELECT fbf_letter_template(
    0,                                                    -- pop (0 = insert)
    NULL,                                                 -- pk (NULL para novo)
    (SELECT pk FROM ts_lettertype WHERE acron = 'S.OFI' LIMIT 1),  -- ts_lettertype
    'Ofício AINTAR - Autorização de Ligação',           -- name
    -- BODY (conteúdo principal com variáveis)
    'Ex.mo(a). Senhor(a),

No seguimento do pedido supra identificado, em nome de {{ NOME_REQUERENTE }}, com o contribuinte nº {{ NIF }}, para a morada {{ MORADA }}, Freguesia de {{ FREGUESIA }}, {{ CODIGO_POSTAL }} {{ LOCALIDADE }} com vista à execução de saneamento, cumpre-nos informar que a intervenção se encontra concluída.

Por conseguinte, uma vez que se encontra autorizada por esta Entidade, deverá V. Exa. diligenciar a ligação à caixa de ramal domiciliário.

Mais se informa, que face ao exposto acima, esta Entidade solicitará à concessionária de abastecimento de água pública que a morada identificada passe a integrar a tarifa de saneamento, pelo que será cobrada a devida taxa na fatura da água.

Com os melhores cumprimentos,

O Presidente da Direção,

_________________________________________
{{ NOME_ASSINANTE }}',
    -- HEADER (logo e destinatário)
    E'[LOGO AINTAR]

Ex.mo(a) Senhor(a)
{{ DESTINATARIO_NOME }}
{{ DESTINATARIO_MORADA }}
{{ DESTINATARIO_CODIGO_POSTAL }} {{ DESTINATARIO_LOCALIDADE }}


Sua referência:        Sua comunicação:        Nossa Referência:        Data: {{ DATA }}
{{ SUA_REFERENCIA }}                           {{ NOSSA_REFERENCIA }}
                       Datado de: {{ DATA_COMUNICACAO }}                 Ofício nº {{ NUMERO_OFICIO }}


Assunto: {{ ASSUNTO }}',
    -- FOOTER (dados da entidade)
    E'Associação de Municípios para o                                      Praça do Município
Sistema Intermunicipal de Águas Residuais                                 3430-167 Carregal do Sal
NIPC 516.132.822                                                          geral@aintar.pt

                                                                          1 de 1
                                                                          AINTAR_MIN_04a_v2',
    1.0,                                                  -- version
    1,                                                    -- active
    -- METADATA (configurações e descrição das variáveis)
    '{
        "tipo": "autorizacao_ligacao",
        "categoria": "saneamento",
        "requer_assinatura": true,
        "template_code": "AINTAR_MIN_04a_v2",
        "variaveis": {
            "header": [
                {"nome": "DESTINATARIO_NOME", "descricao": "Nome do destinatário", "obrigatorio": true},
                {"nome": "DESTINATARIO_MORADA", "descricao": "Morada do destinatário", "obrigatorio": true},
                {"nome": "DESTINATARIO_CODIGO_POSTAL", "descricao": "Código postal", "obrigatorio": true},
                {"nome": "DESTINATARIO_LOCALIDADE", "descricao": "Localidade", "obrigatorio": true},
                {"nome": "SUA_REFERENCIA", "descricao": "Referência do destinatário", "obrigatorio": false},
                {"nome": "NOSSA_REFERENCIA", "descricao": "Referência interna", "obrigatorio": false},
                {"nome": "DATA", "descricao": "Data de emissão", "obrigatorio": true},
                {"nome": "DATA_COMUNICACAO", "descricao": "Data da comunicação recebida", "obrigatorio": false},
                {"nome": "NUMERO_OFICIO", "descricao": "Número do ofício", "obrigatorio": true},
                {"nome": "ASSUNTO", "descricao": "Assunto do ofício", "obrigatorio": true}
            ],
            "body": [
                {"nome": "NOME_REQUERENTE", "descricao": "Nome do requerente", "obrigatorio": true},
                {"nome": "NIF", "descricao": "NIF do requerente", "obrigatorio": true},
                {"nome": "MORADA", "descricao": "Morada da intervenção", "obrigatorio": true},
                {"nome": "FREGUESIA", "descricao": "Freguesia", "obrigatorio": true},
                {"nome": "CODIGO_POSTAL", "descricao": "Código postal", "obrigatorio": true},
                {"nome": "LOCALIDADE", "descricao": "Localidade", "obrigatorio": true},
                {"nome": "NOME_ASSINANTE", "descricao": "Nome de quem assina", "obrigatorio": true, "default": "Paulo Jorge Catalino de Almeida Ferraz"}
            ]
        },
        "instrucoes": "Template para ofícios de autorização de ligação ao sistema de saneamento. Baseado no modelo AINTAR_MIN_04a_v2."
    }'::jsonb
);

-- Template: Ofício AINTAR - Genérico
SELECT fbf_letter_template(
    0,
    NULL,
    (SELECT pk FROM ts_lettertype WHERE acron = 'S.OFI' LIMIT 1),
    'Ofício AINTAR - Modelo Genérico',
    -- BODY
    'Ex.mo(a). Senhor(a),

{{ CORPO_TEXTO }}

Com os melhores cumprimentos,

{{ ASSINATURA_CARGO }},

_________________________________________
{{ NOME_ASSINANTE }}',
    -- HEADER
    E'[LOGO AINTAR]

Ex.mo(a) Senhor(a)
{{ DESTINATARIO_NOME }}
{{ DESTINATARIO_MORADA }}
{{ DESTINATARIO_CODIGO_POSTAL }} {{ DESTINATARIO_LOCALIDADE }}


Sua referência:        Sua comunicação:        Nossa Referência:        Data: {{ DATA }}
{{ SUA_REFERENCIA }}                           {{ NOSSA_REFERENCIA }}
                       Datado de: {{ DATA_COMUNICACAO }}                 Ofício nº {{ NUMERO_OFICIO }}


Assunto: {{ ASSUNTO }}',
    -- FOOTER
    E'Associação de Municípios para o                                      Praça do Município
Sistema Intermunicipal de Águas Residuais                                 3430-167 Carregal do Sal
NIPC 516.132.822                                                          geral@aintar.pt

                                                                          1 de 1
                                                                          AINTAR_MIN_04a_v2',
    1.0,
    1,
    '{
        "tipo": "generico",
        "categoria": "comunicacao_geral",
        "requer_assinatura": true,
        "template_code": "AINTAR_MIN_04a_v2",
        "variaveis": {
            "header": [
                {"nome": "DESTINATARIO_NOME", "descricao": "Nome do destinatário", "obrigatorio": true},
                {"nome": "DESTINATARIO_MORADA", "descricao": "Morada do destinatário", "obrigatorio": true},
                {"nome": "DESTINATARIO_CODIGO_POSTAL", "descricao": "Código postal", "obrigatorio": true},
                {"nome": "DESTINATARIO_LOCALIDADE", "descricao": "Localidade", "obrigatorio": true},
                {"nome": "SUA_REFERENCIA", "descricao": "Referência do destinatário", "obrigatorio": false},
                {"nome": "NOSSA_REFERENCIA", "descricao": "Referência interna", "obrigatorio": false},
                {"nome": "DATA", "descricao": "Data de emissão", "obrigatorio": true},
                {"nome": "DATA_COMUNICACAO", "descricao": "Data da comunicação", "obrigatorio": false},
                {"nome": "NUMERO_OFICIO", "descricao": "Número do ofício", "obrigatorio": true},
                {"nome": "ASSUNTO", "descricao": "Assunto do ofício", "obrigatorio": true}
            ],
            "body": [
                {"nome": "CORPO_TEXTO", "descricao": "Texto principal do ofício", "obrigatorio": true},
                {"nome": "ASSINATURA_CARGO", "descricao": "Cargo de quem assina", "obrigatorio": true, "default": "O Presidente da Direção"},
                {"nome": "NOME_ASSINANTE", "descricao": "Nome de quem assina", "obrigatorio": true, "default": "Paulo Jorge Catalino de Almeida Ferraz"}
            ]
        },
        "instrucoes": "Template genérico para ofícios AINTAR. Permite personalização completa do corpo do texto."
    }'::jsonb
);

-- Verificar templates criados
SELECT
    pk,
    name,
    version,
    active,
    LENGTH(body) as body_length,
    LENGTH(header_template) as header_length,
    LENGTH(footer_template) as footer_length
FROM vbl_letter_template
WHERE name LIKE '%AINTAR%'
ORDER BY pk DESC;
