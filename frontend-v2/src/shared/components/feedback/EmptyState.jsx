import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const icons = {
  default: InboxIcon,
  search: SearchOffIcon,
  folder: FolderOffIcon,
  error: ErrorOutlineIcon,
};

const iconColors = {
  default: 'text.disabled',
  search: 'text.disabled',
  folder: 'text.disabled',
  error: 'error.light',
};

export function EmptyState({
  title = 'Sem dados',
  message = 'Não existem dados para apresentar',
  icon: CustomIcon,
  action,
  actionLabel,
  variant = 'default',
  minHeight = 400,
}) {
  const Icon = CustomIcon || icons[variant] || InboxIcon;
  const color = iconColors[variant] || 'text.disabled';

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        p: { xs: 3, sm: 4 },
        textAlign: 'center',
      }}
    >
      <Icon sx={{ fontSize: { xs: 56, sm: 64 }, color, mb: 2 }} />

      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' }, fontWeight: 600 }}
      >
        {title}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: action ? 3 : 0, maxWidth: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}
      >
        {message}
      </Typography>

      {action && actionLabel && (
        <Button variant="contained" onClick={action} size="large">
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

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

export function EmptyList({
  title = 'Lista vazia',
  message = 'Ainda não existem itens nesta lista',
  actionLabel = 'Adicionar item',
  onAdd,
  minHeight,
}) {
  return (
    <EmptyState
      title={title}
      message={message}
      action={onAdd}
      actionLabel={actionLabel}
      minHeight={minHeight}
    />
  );
}

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  icon: PropTypes.elementType,
  action: PropTypes.func,
  actionLabel: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'search', 'folder', 'error']),
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
