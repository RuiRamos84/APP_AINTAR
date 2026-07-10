-- BUG PRÉ-EXISTENTE (não introduzido nesta sessão): a zona de INSERT (pop=0)
-- de fbf_instalacao_analise declara o parâmetro como "pntb_analiseponto" mas
-- o corpo da função referencia "pntt_analiseponto" (prefixo errado) na
-- cláusula VALUES. Como nunca ninguém tinha chamado esta função com pop=0
-- antes (só existia a zona de UPDATE, usada por analysis_service.py), o erro
-- nunca tinha sido acionado — só apareceu agora que a importação de boletim
-- PDF passou a gravar o histórico completo de análises via esta função.
--
-- Confirmado o mesmo erro nos três schemas onde a função existe:
-- aintar_server_dev, aintar_server (produção) e public. Corre isto em cada
-- um deles antes de usar a funcionalidade de histórico de análises.

SET search_path TO aintar_server_dev, public;

CREATE OR REPLACE FUNCTION fbf_instalacao_analise(
    pop integer,
    pnpk integer,
    pndata date,
    pntb_instalacao integer,
    pntb_analiseponto integer,
    pntt_analiseparam integer,
    pntt_analiseforma integer,
    pnresultado numeric,
    pnoperador1 integer,
    pnoperador2 integer,
    pntb_operacao integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
begin
 -- INSERT ZONE
 if (pop = 0) then
  insert into tb_instalacao_analise (pk,tb_instalacao,tt_analiseponto,tt_analiseparam,tt_analiseforma,resultado,data,operador1,operador2,tb_operacao)
  values (pnpk,pntb_instalacao,pntb_analiseponto,pntt_analiseparam,pntt_analiseforma,pnresultado,pndata,pnoperador1,pnoperador2,pntb_operacao);

  return pnpk;
 end if;

 -- UPDATE ZONE
 if (pop = 1) then
  update tb_instalacao_analise set resultado = pnresultado, updt_client = fs_client(), updt_time = current_timestamp where pk = pnpk;

  return pnpk;
 end if;

 -- DELETE ZONE
 if (pop = 2) then select fs_errors (8, 'instalacao_analise'); end if;
end; $function$;
