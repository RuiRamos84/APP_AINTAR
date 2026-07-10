-- Correção: anular 60 movimentos de Caixa criados indevidamente por pagamentos
-- aprovados via Transferência Bancária (bug em approve_payment, já corrigido em
-- payment_service.py:969-972). A Caixa deve registar só dinheiro físico —
-- fbf_caixa não suporta DELETE (ledger financeiro não se apaga, anula-se),
-- por isso lança-se um movimento de "Saída" (tipo 3) que anula cada "Entrada"
-- indevida (tipo 2), preservando o rasto de auditoria.
--
-- Afeta: schema aintar_server (produção). Total a anular: 60 registos, €8.600.
-- Saldo da Caixa antes: €8.721,28 → depois: €121,28.
--
-- Correr dentro de uma transação e confirmar a contagem antes do COMMIT.

BEGIN;

INSERT INTO aintar_server.tb_caixa (
    pk, tt_caixamovimento, data, valor,
    tb_document, ordempagamento,
    ts_client1, ts_client2,
    hist_client, hist_time
)
SELECT
    aintar_server.fs_nextcode(),
    3,                                                          -- Saída
    NOW(),
    -c.valor,                                                   -- anula o valor original
    c.tb_document,
    'CORRECAO-CAIXA-PK' || c.pk || ': anulação de lançamento indevido (transferência bancária aprovada criou movimento de caixa por engano)',
    82,                                                         -- ts_client1 = Rui Ramos
    NULL,
    82,                                                         -- hist_client = Rui Ramos
    NOW()
FROM aintar_server.tb_caixa c
JOIN aintar_server.tb_document_invoice di ON di.tb_document = c.tb_document
JOIN aintar_server.tb_sibs s ON s.pk = di.tb_sibs
WHERE c.tt_caixamovimento = 2
  AND s.payment_method = 'BANK_TRANSFER';

-- Verificação antes de confirmar:
--   1) devem aparecer 60 linhas novas, tipo 3, cada uma com valor negativo
--      igual e simétrico a um lançamento tipo 2 existente
--   2) o saldo final deve ficar em 121.28
SELECT COUNT(*) AS novos_lancamentos_saida
FROM aintar_server.tb_caixa
WHERE tt_caixamovimento = 3
  AND ordempagamento LIKE 'CORRECAO-CAIXA-PK%'
  AND hist_time > NOW() - INTERVAL '1 minute';

SELECT COALESCE(SUM(valor), 0) AS saldo_caixa_apos_correcao
FROM aintar_server.tb_caixa;

-- Se novos_lancamentos_saida = 60 e saldo_caixa_apos_correcao = 121.28, confirmar:
-- COMMIT;
-- Caso contrário:
-- ROLLBACK;
