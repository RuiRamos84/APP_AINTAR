import React from 'react';
import { Box, Typography, Button, Stack, alpha } from '@mui/material';
import {
  TaskAlt, Assignment, SearchOff, WifiOff,
  CloudOff, ErrorOutline, Celebration, Add
} from '@mui/icons-material';

/**
 * EMPTY STATE V2 - Estados Vazios com CTAs
 *
 * Estados suportados:
 * - no-tasks: Sem tarefas pendentes
 * - no-metas: Sem metas criadas
 * - no-search-results: Sem resultados de pesquisa
 * - offline: Sem conexão
 * - error: Erro genérico
 * - completed-all: Todas tarefas concluídas
 *
 * Benefícios:
 * - Guia o utilizador na próxima ação
 * - Reduz confusão com telas vazias
 * - Aumenta engagement
 */

const emptyStates = {
  'no-tasks': {
    icon: TaskAlt,
    iconColor: 'success.main',
    title: 'Nenhuma tarefa pendente',
    message: 'Parabéns! Está tudo em ordem.',
    illustration: '🎉',
    action: {
      label: 'Ver Histórico',
      variant: 'outlined',
      color: 'primary'
    },
    secondaryAction: {
      label: 'Atualizar',
      variant: 'text'
    }
  },

  'no-metas': {
    icon: Assignment,
    iconColor: 'primary.main',
    title: 'Nenhuma meta definida',
    message: 'Comece por criar a primeira meta de operação para organizar o trabalho da equipa.',
    illustration: '📋',
    action: {
      label: 'Criar Primeira Meta',
      variant: 'contained',
      color: 'primary',
      startIcon: <Add />
    }
  },

  'no-search-results': {
    icon: SearchOff,
    iconColor: 'text.secondary',
    title: 'Nenhum resultado encontrado',
    message: 'Tente ajustar os filtros de pesquisa ou limpar os critérios.',
    illustration: '🔍',
    action: {
      label: 'Limpar Filtros',
      variant: 'outlined',
      color: 'primary'
    }
  },

  'offline': {
    icon: WifiOff,
    iconColor: 'warning.main',
    title: 'Sem conexão',
    message: 'Verifique a sua ligação à internet e tente novamente.',
    illustration: '📡',
    action: {
      label: 'Tentar Novamente',
      variant: 'contained',
      color: 'primary'
    }
  },

  'error': {
    icon: ErrorOutline,
    iconColor: 'error.main',
    title: 'Algo correu mal',
    message: 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.',
    illustration: '⚠️',
    action: {
      label: 'Tentar Novamente',
      variant: 'contained',
      color: 'error'
    },
    secondaryAction: {
      label: 'Reportar Problema',
      variant: 'text'
    }
  },

  'completed-all': {
    icon: Celebration,
    iconColor: 'success.main',
    title: 'Excelente trabalho!',
    message: 'Todas as tarefas foram concluídas com sucesso.',
    illustration: '🏆',
    action: {
      label: 'Ver Relatório',
      variant: 'contained',
      color: 'success'
    }
  },

  'no-data': {
    icon: CloudOff,
    iconColor: 'text.secondary',
    title: 'Sem dados disponíveis',
    message: 'Não há informação para mostrar neste momento.',
    illustration: '📊',
    action: {
      label: 'Atualizar',
      variant: 'outlined',
      color: 'primary'
    }
  }
};

const EmptyStateV2 = ({
  type = 'no-data',
  customTitle,
  customMessage,
  customAction,
  customSecondaryAction,
  onAction,
  onSecondaryAction,
  compact = false,
  showIllustration = true,
}) => {
  const config = emptyStates[type] || emptyStates['no-data'];
  const IconComponent = config.icon;

  const title = customTitle || config.title;
  const message = customMessage || config.message;
  const action = customAction || config.action;
  const secondaryAction = customSecondaryAction || config.secondaryAction;

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      py={compact ? 4 : 8}
      px={2}
      sx={{
        minHeight: compact ? 200 : 400,
      }}
    >
      {/* Ilustração/Icon */}
      {showIllustration && (
        <Box
          sx={{
            mb: 3,
            p: 3,
            borderRadius: '50%',
            bgcolor: theme => alpha(theme.palette[config.iconColor?.split('.')[0]]?.main || theme.palette.grey[500], 0.1),
          }}
        >
          {config.illustration ? (
            <Typography variant="h1" sx={{ fontSize: compact ? '3rem' : '4rem' }}>
              {config.illustration}
            </Typography>
          ) : (
            <IconComponent
              sx={{
                fontSize: compact ? 60 : 80,
                color: config.iconColor,
                opacity: 0.8
              }}
            />
          )}
        </Box>
      )}

      {/* Título */}
      <Typography
        variant={compact ? 'h6' : 'h5'}
        gutterBottom
        sx={{ fontWeight: 600, mb: 1 }}
      >
        {title}
      </Typography>

      {/* Mensagem */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          maxWidth: 400,
          mb: 3,
          lineHeight: 1.6
        }}
      >
        {message}
      </Typography>

      {/* Ações */}
      <Stack direction={compact ? 'column' : 'row'} spacing={2}>
        {action && onAction && (
          <Button
            variant={action.variant || 'contained'}
            color={action.color || 'primary'}
            onClick={onAction}
            size={compact ? 'medium' : 'large'}
            startIcon={action.startIcon}
            sx={{ minWidth: compact ? 'auto' : 160 }}
          >
            {action.label}
          </Button>
        )}

        {secondaryAction && onSecondaryAction && (
          <Button
            variant={secondaryAction.variant || 'text'}
            color={secondaryAction.color || 'primary'}
            onClick={onSecondaryAction}
            size={compact ? 'small' : 'medium'}
          >
            {secondaryAction.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
};

// ============================================================
// COMPONENTES ESPECIALIZADOS (shortcuts)
// ============================================================

export const NoTasksEmpty = ({ onRefresh, onViewHistory }) => (
  <EmptyStateV2
    type="no-tasks"
    onAction={onViewHistory}
    onSecondaryAction={onRefresh}
  />
);

export const NoMetasEmpty = ({ onCreateMeta }) => (
  <EmptyStateV2
    type="no-metas"
    onAction={onCreateMeta}
  />
);

export const NoSearchResultsEmpty = ({ onClearFilters }) => (
  <EmptyStateV2
    type="no-search-results"
    onAction={onClearFilters}
    compact
  />
);

export const OfflineEmpty = ({ onRetry }) => (
  <EmptyStateV2
    type="offline"
    onAction={onRetry}
  />
);

export const ErrorEmpty = ({ onRetry, onReport, errorMessage }) => (
  <EmptyStateV2
    type="error"
    customMessage={errorMessage}
    onAction={onRetry}
    onSecondaryAction={onReport}
  />
);

export const CompletedAllEmpty = ({ onViewReport }) => (
  <EmptyStateV2
    type="completed-all"
    onAction={onViewReport}
  />
);

export default EmptyStateV2;
