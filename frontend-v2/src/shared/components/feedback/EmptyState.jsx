/**
 * EmptyState Component
 * Estados vazios para diferentes contextos
 */

import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import PropTypes from 'prop-types';

/**
 * Empty State genérico
 */
export function EmptyState({
  title = 'Sem dados',
  message = 'Não existem dados para apresentar',
  icon: CustomIcon = InboxIcon,
  action,
  actionLabel,
  variant = 'default', // 'default' | 'search' | 'folder'
}) {
  // Ícones predefinidos por variante
  const icons = {
    default: InboxIcon,
    search: SearchOffIcon,
    folder: FolderOffIcon,
  };

  const Icon = CustomIcon || icons[variant];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
    >
      <Icon
        sx={{
          fontSize: { xs: 56, sm: 64 },
          color: 'text.disabled',
          mb: 2,
        }}
      />

      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontSize: { xs: '1.125rem', sm: '1.25rem' },
          fontWeight: 600,
        }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mb: 3,
          maxWidth: 500,
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        {message}
      </Typography>

      {action && actionLabel && (
        <Button
          variant="contained"
          onClick={action}
          size="large"
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

/**
 * Empty Search Results
 */
export function EmptySearch({ searchTerm, onClear }) {
  return (
    <EmptyState
      variant="search"
      title="Sem resultados"
      message={`Não foram encontrados resultados para "${searchTerm}"`}
      action={onClear}
      actionLabel="Limpar pesquisa"
    />
  );
}

/**
 * Empty List
 */
export function EmptyList({
  title = 'Lista vazia',
  message = 'Ainda não existem itens nesta lista',
  actionLabel = 'Adicionar item',
  onAdd,
}) {
  return (
    <EmptyState
      title={title}
      message={message}
      action={onAdd}
      actionLabel={actionLabel}
    />
  );
}

// PropTypes
EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  icon: PropTypes.elementType,
  action: PropTypes.func,
  actionLabel: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'search', 'folder']),
};

EmptySearch.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onClear: PropTypes.func,
};

EmptyList.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAdd: PropTypes.func,
};
