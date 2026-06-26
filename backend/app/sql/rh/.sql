SET search_path TO aintar_server_dev, public;

-- 1. As funções ficaram criadas?
SELECT p.oid::regprocedure FROM pg_proc p WHERE p.proname IN ('fbf_param', 'fbf_param_operacaoaccao');

-- 2. A view de associação já expõe "pk"?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vbl_param_operacaoaccao' ORDER BY ordinal_position;

-- 3. Corpo completo das duas funções, para eu confirmar a assinatura exata
SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = 'fbf_param';
SELECT pg_get_functiondef(p.oid) FROM pg_proc p WHERE p.proname = 'fbf_param_operacaoaccao';

