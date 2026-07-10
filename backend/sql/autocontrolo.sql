-- Autocontrolo de instalações (ETAR): tabela, view, funções e procedimentos.
-- Extraído por introspeção da BD de desenvolvimento (schema aintar_server_dev)
-- em 2026-07-01 — este ficheiro documenta objetos já existentes na BD, para
-- que o ambiente seja reprodutível noutra instância. Não foi executado
-- nenhum DDL diretamente pela IA; corre isto manualmente se precisares de
-- recriar o schema noutro ambiente (produção já o tem).

-- ===================================================================
-- Lookup de periodicidade (1=Mensal, 2=Trimestral)
-- ===================================================================
-- tt_instalacaoautocontrolo(pk integer, value text)
--   1 | Mensal
--   2 | Trimestral
-- tb_instalacao.tt_instalacaoautocontrolo (integer, FK -> tt_instalacaoautocontrolo.pk)
--   já existente na tabela tb_instalacao — configurado na tab "Características"
--   de cada ETAR (ver update_etar_details em etar_ee_service.py).

-- ===================================================================
-- Tabela de dados: um registo por (instalação, ano, período)
-- ===================================================================
CREATE TABLE IF NOT EXISTS tb_instalacao_autocontrolo (
    pk              integer PRIMARY KEY,
    tb_instalacao   integer REFERENCES tb_instalacao (pk),
    ano             integer,
    periodo         integer,
    boletim         text,
    data            date,
    cumprimento     integer  -- NULL=por reportar, 1=cumpre, 0=não cumpre
);

-- ===================================================================
-- View de leitura (padrão vbl_ do projeto)
-- ===================================================================
-- status devolvido: -1=Cumpre, 0=A aguardar, 1=Não cumpre, 2=Atenção, 3=Atraso
CREATE OR REPLACE VIEW vbl_instalacao_autocontrolo AS
SELECT
    b.pk,
    b.tb_instalacao,
    b.ano,
    b.periodo,
    b.boletim,
    b.data,
    b.cumprimento,
    "fbf_instalacao_autocontrolo$status"(b.cumprimento, i.tt_instalacaoautocontrolo, b.ano, b.periodo) AS status
FROM tb_instalacao_autocontrolo b
JOIN tb_instalacao i ON i.pk = b.tb_instalacao;

-- ===================================================================
-- fbf_instalacao_autocontrolo$status — calcula o status a partir do
-- cumprimento reportado (ou, se ainda não reportado, da posição do período
-- face à data atual: a aguardar / em atenção no último terço / em atraso
-- depois de terminar).
-- ===================================================================
CREATE OR REPLACE FUNCTION "fbf_instalacao_autocontrolo$status"(
    pncumprimento   integer,
    pnperiodicidade integer,
    pnano           integer,
    pnperiodo       integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
 v_dt_inicio date;
 v_dt_fim    date;
begin
 -- análise válida
 if pncumprimento = 1 then return -1; end if;

 -- análise inválida
 if pncumprimento = 0 then return 1; end if;

 -- cumprimento is null: calcular datas do período
 if pnperiodicidade = 1 then  -- mensal
  v_dt_inicio := make_date(pnano, pnperiodo, 1);
  v_dt_fim    := (v_dt_inicio + interval '1 month' - interval '1 day')::date;
 elsif pnperiodicidade = 2 then  -- trimestral
  v_dt_inicio := make_date(pnano, (pnperiodo - 1) * 3 + 1, 1);
  v_dt_fim    := (v_dt_inicio + interval '3 months' - interval '1 day')::date;
 else
  return 0;  -- periodicidade desconhecida
 end if;

 -- período ainda não começou
 if current_date < v_dt_inicio then return 0; end if;

 -- período já terminou
 if current_date > v_dt_fim then return 3; end if;

 -- último terço do período
 if current_date >= v_dt_inicio + ((v_dt_fim - v_dt_inicio) * 2 / 3) then return 2; end if;

 -- primeiro dois terços
 return 0;
end; $function$;

-- ===================================================================
-- fbf_instalacao_autocontrolo — CRUD do período (pop=1 é o único suportado:
-- os períodos são criados só via $init/$initall, nunca por INSERT direto do
-- utilizador; DELETE também não é suportado).
-- ===================================================================
CREATE OR REPLACE FUNCTION fbf_instalacao_autocontrolo(
    pop             integer,
    pnpk            integer,
    pnboletim       text,
    pndata          date,
    pncumprimento   integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
begin
 -- INSERT ZONE
 if (pop = 0) then select fs_errors (1, 'instalacao_autocontrolo'); end if;

 -- UPDATE ZONE
 if (pop = 1) then
  update tb_instalacao_autocontrolo set boletim = pnboletim, data = pndata, cumprimento = pncumprimento where pk = pnpk;

  return pnpk;
 end if;

 -- DELETE ZONE
 if (pop = 2) then select fs_errors (3, 'instalacao_autocontrolo'); end if;
end; $function$;

-- ===================================================================
-- fbf_instalacao_autocontrolo$init / $initall — geram os períodos em falta
-- (1 a 12 se mensal, 1 a 4 se trimestral) para um ano. Idempotentes
-- (ON CONFLICT DO NOTHING). Não têm rota HTTP própria neste momento — correr
-- diretamente na BD no início de cada ano civil, ou expor um endpoint de
-- administração se se tornar uma tarefa recorrente do utilizador.
-- ===================================================================
CREATE OR REPLACE PROCEDURE "fbf_instalacao_autocontrolo$init"(
    IN pnano integer,
    IN pntb_instalacao integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
 v_periodicidade integer;
 v_num_periodos integer;
 v_periodo integer;
begin
 -- obter periodicidade da instalação
 select tt_instalacaoautocontrolo into v_periodicidade from tb_instalacao where pk = pntb_instalacao;

 -- se não estiver preenchido, não faz nada
 if v_periodicidade is null then return; end if;

 -- determinar número de períodos
 if v_periodicidade = 1 then v_num_periodos := 12; elsif v_periodicidade = 2 then v_num_periodos := 4; else return; end if;

 -- inserir períodos em falta
 for v_periodo in 1..v_num_periodos loop
  insert into tb_instalacao_autocontrolo (pk, tb_instalacao, ano, periodo) values (nextval('sq_codes'), pntb_instalacao, pnano, v_periodo) on conflict do nothing;
 end loop;
end; $procedure$;

CREATE OR REPLACE PROCEDURE "fbf_instalacao_autocontrolo$initall"(
    IN pnano integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
 v_instalacao integer;
begin
 for v_instalacao in select pk from tb_instalacao where tt_instalacaoautocontrolo in (1, 2) loop
  call "fbf_instalacao_autocontrolo$init"(pnano, v_instalacao);
 end loop;
end; $procedure$;

-- Gerar os períodos do ano corrente para todas as instalações com
-- periodicidade configurada (correr uma vez por ano, ou quando uma nova
-- instalação passa a ter autocontrolo configurado):
-- CALL "fbf_instalacao_autocontrolo$initall"(extract(year from current_date)::integer);


SET search_path TO aintar_server_dev, public;

CREATE TABLE IF NOT EXISTS tb_pdf_local_colheita (
    pk              SERIAL PRIMARY KEY,
    local_colheita  TEXT NOT NULL UNIQUE,
    tb_instalacao   INTEGER NOT NULL REFERENCES tb_instalacao (pk),
    ts_updated      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW vbl_pdf_local_colheita AS
SELECT pk, local_colheita, tb_instalacao, ts_updated
FROM tb_pdf_local_colheita;

CREATE OR REPLACE FUNCTION fbf_pdf_local_colheita(
    pop             integer,
    pnlocal_colheita text,
    pntb_instalacao  integer
) RETURNS integer AS $$
DECLARE
    result_pk integer;
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_pdf_local_colheita (local_colheita, tb_instalacao, ts_updated)
        VALUES (pnlocal_colheita, pntb_instalacao, now())
        ON CONFLICT (local_colheita)
        DO UPDATE SET tb_instalacao = EXCLUDED.tb_instalacao, ts_updated = now()
        RETURNING pk INTO result_pk;
    END IF;
    RETURN result_pk;
END;
$$ LANGUAGE plpgsql;




SET search_path TO aintar_server_dev, public;

CREATE TABLE IF NOT EXISTS tb_pdf_local_colheita (
    pk              SERIAL PRIMARY KEY,
    local_colheita  TEXT NOT NULL UNIQUE,
    tb_instalacao   INTEGER NOT NULL REFERENCES tb_instalacao (pk),
    ts_updated      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW vbl_pdf_local_colheita AS
SELECT pk, local_colheita, tb_instalacao, ts_updated
FROM tb_pdf_local_colheita;

CREATE OR REPLACE FUNCTION fbf_pdf_local_colheita(
    pop             integer,
    pnlocal_colheita text,
    pntb_instalacao  integer
) RETURNS integer AS $$
DECLARE
    result_pk integer;
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_pdf_local_colheita (local_colheita, tb_instalacao, ts_updated)
        VALUES (pnlocal_colheita, pntb_instalacao, now())
        ON CONFLICT (local_colheita)
        DO UPDATE SET tb_instalacao = EXCLUDED.tb_instalacao, ts_updated = now()
        RETURNING pk INTO result_pk;
    END IF;
    RETURN result_pk;
END;
$$ LANGUAGE plpgsql;