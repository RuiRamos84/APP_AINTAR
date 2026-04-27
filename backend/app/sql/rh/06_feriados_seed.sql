-- backend/app/sql/rh/06_feriados_seed.sql
-- Feriados nacionais obrigatórios PT (fixos + móveis pré-calculados)

INSERT INTO ts_feriados (pk, data, descr, nacional) VALUES
-- 2025
(fs_nextcode(), '2025-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2025-04-18', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2025-04-20', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2025-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2025-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2025-06-19', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2025-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2025-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2025-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2025-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2025-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2025-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2025-12-25', 'Natal',                             TRUE),
-- 2026
(fs_nextcode(), '2026-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2026-04-03', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2026-04-05', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2026-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2026-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2026-06-04', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2026-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2026-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2026-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2026-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2026-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2026-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2026-12-25', 'Natal',                             TRUE),
-- 2027
(fs_nextcode(), '2027-01-01', 'Ano Novo',                          TRUE),
(fs_nextcode(), '2027-03-26', 'Sexta-Feira Santa',                 TRUE),
(fs_nextcode(), '2027-03-28', 'Domingo de Páscoa',                 TRUE),
(fs_nextcode(), '2027-04-25', 'Dia da Liberdade',                  TRUE),
(fs_nextcode(), '2027-05-01', 'Dia do Trabalhador',                TRUE),
(fs_nextcode(), '2027-05-27', 'Corpo de Deus',                     TRUE),
(fs_nextcode(), '2027-06-10', 'Dia de Portugal',                   TRUE),
(fs_nextcode(), '2027-08-15', 'Assunção de Nossa Senhora',         TRUE),
(fs_nextcode(), '2027-10-05', 'Implantação da República',          TRUE),
(fs_nextcode(), '2027-11-01', 'Dia de Todos os Santos',            TRUE),
(fs_nextcode(), '2027-12-01', 'Restauração da Independência',      TRUE),
(fs_nextcode(), '2027-12-08', 'Imaculada Conceição',               TRUE),
(fs_nextcode(), '2027-12-25', 'Natal',                             TRUE)
ON CONFLICT (data) DO NOTHING;
