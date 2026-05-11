-- Migration: Adicionar photo_path a tb_operacao
-- Data: 2026-04-30
-- Motivo: Suporte a fotos na conclusão de tarefas de operação

ALTER TABLE tb_operacao ADD COLUMN IF NOT EXISTS photo_path TEXT;
