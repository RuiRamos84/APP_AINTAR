-- Correção: fbo_document_invoice$getset() nunca chamava fbo_document_invoice$14(),
-- apesar desta função (e a tarifa em ts_contractbase, family=-101) já existirem.
-- Resultado: pedidos do tipo 14 ("Informação Sobre Sistemas Públicos") ficavam
-- sem valor de fatura (invoice = NULL) a não ser que alguém o introduzisse à mão,
-- impedindo o registo normal de pagamento. Confirmado em produção: 4 dos últimos
-- 6 pedidos E.PUB submetidos não tinham valor nenhum (ex: 2026.E.PUB.001760).
--
-- fbo_document_invoice$14 já trata tudo (calcula a partir de ts_contractbase e
-- insere/atualiza tb_document_invoice) — só falta o despacho em getset() chamá-la.
--
-- Afeta: fbo_document_invoice$getset(), sem alterar mais nada na função.
-- Correr primeiro em aintar_server_dev, confirmar, só depois em aintar_server (produção).
-- Confirmar o schema ativo antes de correr:
--   SELECT current_schemas(false);

BEGIN;

CREATE OR REPLACE FUNCTION "fbo_document_invoice$getset"(pnpk integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
 t integer;
 v numeric;
begin
 select invoice into v from tb_document_invoice where tb_document = pnpk;
 if (v is not null) then return v; end if;

 select tt_type into t from tb_document where pk = pnpk;

 -- casos especiais onde, não existindo valor de orçamento, o mesmo é calculado, introduzido e devolvido
 if (t = 1) then return fbo_document_invoice$1 (pnpk); end if;
 if (t = 2) then return fbo_document_invoice$2 (pnpk); end if;
 if (t = 14) then return "fbo_document_invoice$14" (pnpk); end if;

 return null;
end; $function$;

-- Verificação antes de confirmar: o corpo da função deve agora conter a chamada ao tipo 14
SELECT prosrc LIKE '%t = 14%' AS tem_ramo_tipo_14
FROM pg_proc
WHERE proname = 'fbo_document_invoice$getset';

-- Se tem_ramo_tipo_14 = true, confirmar:
-- COMMIT;
-- Caso contrário:
-- ROLLBACK;

-- Depois do COMMIT, para corrigir também o pedido real que motivou este fix
-- (2026.E.PUB.001760, pk 184662, só existe em produção) basta chamar a função
-- normal — vai calcular e gravar o valor em falta, sem precisar de UPDATE manual:
--   SELECT fbo_document_invoice$getset(184662);
-- Deve devolver 25.
