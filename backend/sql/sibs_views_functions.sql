-- ============================================================
-- SIBS Payment Module - Views e Funções de Base de Dados
-- Gerado em: 2026-02-23
--
-- DESENVOLVIMENTO : schema aintar_server_dev  (já configurado abaixo)
-- PRODUÇÃO        : substituir 'aintar_server_dev' por 'aintar_server'
-- ============================================================


-- ============================================================
-- VIEWS DE LEITURA (vbl_*)
-- ============================================================

-- vbl_sibs_invoice
-- Perspectiva SIBS → Documento: JOIN tb_sibs → tb_document_invoice
-- Utilizada em: check_payment_status, process_webhook
CREATE OR REPLACE VIEW aintar_server_dev.vbl_sibs_invoice AS
SELECT
    s.pk               AS sibs_pk,
    s.transaction_id,
    s.order_id,
    s.payment_status,
    s.payment_method,
    s.expiry_date,
    s.amount,
    s.created_at,
    s.updated_at,
    di.pk              AS invoice_pk,
    di.tb_document,
    di.invoice,
    di.presented,
    di.accepted,
    di.payed,
    di.closed
FROM aintar_server_dev.tb_sibs s
LEFT JOIN aintar_server_dev.tb_document_invoice di ON di.tb_sibs = s.pk;


-- vbl_sibs_pending
-- Pagamentos pendentes de validação com info do documento (exclui isenções)
-- Utilizada em: get_pending_payments
CREATE OR REPLACE VIEW aintar_server_dev.vbl_sibs_pending AS
SELECT
    s.pk,
    s.order_id,
    s.transaction_id,
    s.amount,
    s.payment_method,
    s.payment_status,
    s.payment_reference,
    s.created_at,
    s.entity,
    di.tb_document,
    d.regnumber,
    d.memo             AS document_descr
FROM aintar_server_dev.tb_sibs s
LEFT JOIN aintar_server_dev.tb_document_invoice di ON di.tb_sibs = s.pk
LEFT JOIN aintar_server_dev.tb_document d ON d.pk = di.tb_document
WHERE s.payment_status = 'PENDING_VALIDATION'
  AND s.payment_method != 'ISENCAO';


-- vbl_sibs_details
-- Detalhes completos do pagamento com informação do validador
-- Utilizada em: get_payment_details
CREATE OR REPLACE VIEW aintar_server_dev.vbl_sibs_details AS
SELECT
    s.pk,
    s.order_id,
    s.transaction_id,
    s.amount,
    s.payment_method,
    s.payment_status,
    s.payment_reference,
    s.created_at,
    s.updated_at,
    s.validated_by,
    s.validated_at,
    di.pk              AS invoice_pk,
    di.tb_document,
    di.invoice,
    di.presented,
    di.accepted,
    di.payed,
    di.closed,
    di.urgency,
    d.regnumber,
    d.memo             AS document_descr,
    c.name             AS validator_name
FROM aintar_server_dev.tb_sibs s
LEFT JOIN aintar_server_dev.tb_document_invoice di ON di.tb_sibs = s.pk
LEFT JOIN aintar_server_dev.tb_document d ON d.pk = di.tb_document
LEFT JOIN aintar_server_dev.ts_client c ON c.pk = s.validated_by;


-- vbl_document_payment
-- Perspectiva Documento → SIBS: JOIN tb_document_invoice → tb_sibs
-- Mantém registo mesmo quando ainda não há pagamento (SIBS pode ser NULL)
-- Utilizada em: get_document_payment_status
CREATE OR REPLACE VIEW aintar_server_dev.vbl_document_payment AS
SELECT
    di.pk,
    di.tb_document,
    di.invoice,
    di.presented,
    di.accepted,
    di.payed,
    di.closed,
    s.pk               AS sibs_pk,
    s.transaction_id,
    s.payment_status,
    s.payment_method,
    s.amount,
    s.created_at       AS payment_created
FROM aintar_server_dev.tb_document_invoice di
LEFT JOIN aintar_server_dev.tb_sibs s ON s.pk = di.tb_sibs;


-- vbl_sibs_history
-- Histórico de todos os pagamentos com info do documento (sem filtro de estado)
-- Utilizada em: get_payment_history (filtros dinâmicos aplicados em Python)
CREATE OR REPLACE VIEW aintar_server_dev.vbl_sibs_history AS
SELECT
    s.pk,
    s.order_id,
    s.transaction_id,
    s.amount,
    s.payment_method,
    s.payment_status,
    s.payment_reference,
    s.created_at,
    s.updated_at,
    s.validated_by,
    s.validated_at,
    di.tb_document,
    d.regnumber,
    d.memo             AS document_descr
FROM aintar_server_dev.tb_sibs s
LEFT JOIN aintar_server_dev.tb_document_invoice di ON di.tb_sibs = s.pk
LEFT JOIN aintar_server_dev.tb_document d ON d.pk = di.tb_document;


-- vbl_sibs_exemptions_pending
-- Isenções pendentes de validação (payment_method = 'ISENCAO')
-- Utilizada em: get_pending_exemptions
CREATE OR REPLACE VIEW aintar_server_dev.vbl_sibs_exemptions_pending AS
SELECT
    s.pk,
    s.order_id,
    s.transaction_id,
    s.amount,
    s.payment_method,
    s.payment_status,
    s.payment_reference,
    s.created_at,
    s.entity,
    di.tb_document,
    d.regnumber,
    d.memo             AS document_descr
FROM aintar_server_dev.tb_sibs s
LEFT JOIN aintar_server_dev.tb_document_invoice di ON di.tb_sibs = s.pk
LEFT JOIN aintar_server_dev.tb_document d ON d.pk = di.tb_document
WHERE s.payment_method = 'ISENCAO'
  AND s.payment_status = 'PENDING_VALIDATION';


-- ============================================================
-- FUNÇÕES DE NEGÓCIO (fbo_*)
-- ============================================================

-- fbo_sibs_status
-- Atualiza estado e referência de pagamento num registo SIBS por transaction_id
-- Substitui UPDATE direto em tb_sibs
-- Utilizada em: check_payment_status, process_webhook
CREATE OR REPLACE FUNCTION aintar_server_dev.fbo_sibs_status(
    pn_transaction_id varchar,
    pn_status         varchar,
    pn_reference      text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    UPDATE aintar_server_dev.tb_sibs
    SET payment_status    = pn_status,
        payment_reference = pn_reference,
        updated_at        = current_timestamp
    WHERE transaction_id  = pn_transaction_id;

    return 1;
end; $function$;


-- fbo_sibs_approve
-- Aprova um pagamento: define estado SUCCESS, regista validador e timestamps
-- Substitui UPDATE direto em tb_sibs
-- Utilizada em: approve_payment
CREATE OR REPLACE FUNCTION aintar_server_dev.fbo_sibs_approve(
    pn_pk   integer,
    pn_user integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    UPDATE aintar_server_dev.tb_sibs
    SET payment_status = 'SUCCESS',
        validated_by   = pn_user,
        validated_at   = current_timestamp,
        updated_at     = current_timestamp
    WHERE pk           = pn_pk;

    return 1;
end; $function$;


-- fbo_document_invoice$link
-- Associa um registo SIBS à fatura de um documento
-- Substitui UPDATE direto em tb_document_invoice
-- Utilizada em: process_mbway_from_checkout, process_multibanco_from_checkout,
--               register_manual_payment_direct
CREATE OR REPLACE FUNCTION aintar_server_dev."fbo_document_invoice$link"(
    pn_document integer,
    pn_sibs     integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    UPDATE aintar_server_dev.tb_document_invoice
    SET tb_sibs       = pn_sibs
    WHERE tb_document = pn_document;

    return 1;
end; $function$;


-- fbo_document_exemption$submit
-- Cria registo de isenção em tb_sibs e associa à fatura do documento
-- Utilizada em: submit_exemption
-- Nota: fbo_document_invoice$2 deve ser modificado para NÃO auto-pagar
--       quando pnpar010 > 0 (Gratuito), chamando esta função em alternativa
CREATE OR REPLACE FUNCTION aintar_server_dev."fbo_document_exemption$submit"(
    pn_document integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_pk        integer;
    v_regnumber varchar;
BEGIN
    -- Obter regnumber do documento
    SELECT regnumber INTO v_regnumber
    FROM aintar_server_dev.tb_document
    WHERE pk = pn_document;

    -- Gerar PK único
    SELECT nextval('sq_codes') INTO v_pk;

    -- Criar registo SIBS de isenção
    INSERT INTO aintar_server_dev.tb_sibs (
        pk, order_id, transaction_id,
        amount, currency,
        payment_method, payment_status,
        created_at, updated_at
    ) VALUES (
        v_pk,
        'ISENCAO-' || pn_document,
        'ISENCAO-' || pn_document || '-' || extract(epoch from now())::bigint,
        0, 'EUR',
        'ISENCAO',
        'PENDING_VALIDATION',
        current_timestamp, current_timestamp
    );

    -- Associar à fatura do documento
    UPDATE aintar_server_dev.tb_document_invoice
    SET tb_sibs = v_pk
    WHERE tb_document = pn_document;

    RETURN v_pk;
END;
$function$;


-- fbo_sibs_reject
-- Rejeita uma isenção ou pagamento: define estado REJECTED, regista validador,
-- desliga SIBS da fatura e repõe o parâmetro Gratuito a 0
-- Utilizada em: reject_exemption
CREATE OR REPLACE FUNCTION aintar_server_dev.fbo_sibs_reject(
    pn_pk   integer,
    pn_user integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_document integer;
BEGIN
    -- Marcar como rejeitado
    UPDATE aintar_server_dev.tb_sibs
    SET payment_status = 'REJECTED',
        validated_by   = pn_user,
        validated_at   = current_timestamp,
        updated_at     = current_timestamp
    WHERE pk           = pn_pk;

    -- Encontrar o documento associado
    SELECT tb_document INTO v_document
    FROM aintar_server_dev.tb_document_invoice
    WHERE tb_sibs = pn_pk;

    -- Desligar o registo SIBS e limpar data de pagamento
    IF v_document IS NOT NULL THEN
        UPDATE aintar_server_dev.tb_document_invoice
        SET tb_sibs = NULL,
            payed   = NULL
        WHERE tb_sibs = pn_pk;

        -- Repor parâmetro 'Gratuito' a 0
        UPDATE aintar_server_dev.tb_document_param dp
        SET value = '0'
        FROM aintar_server_dev.tb_param p
        WHERE dp.tb_param  = p.pk
          AND dp.tb_document = v_document
          AND p.name         = 'Gratuito';
    END IF;

    RETURN 1;
END;
$function$;
