/**
 * Card Component - Atómico
 * Container reutilizável para conteúdo
 */

import { Card as MuiCard, CardContent, CardHeader, CardActions } from '@mui/material';
import { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

// Context para partilhar configuração entre sub-componentes
const CardContext = createContext({});

/**
 * Card principal com padrão Compound Component
 * Permite composição flexível: Card.Header, Card.Content, Card.Actions
 */
export function Card({
  children,
  variant = 'outlined',
  elevation = 0,
  sx,
  ...props
}) {
  return (
    <CardContext.Provider value={{ variant }}>
      <MuiCard
        variant={variant}
        elevation={elevation}
        sx={{
          borderRadius: 3,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: (theme) => theme.shadows[4],
          },
          ...sx,
        }}
        {...props}
      >
        {children}
      </MuiCard>
    </CardContext.Provider>
  );
}

/**
 * Card Header
 */
Card.Header = function CardHeaderComponent({
  title,
  subheader,
  action,
  avatar,
  ...props
}) {
  return (
    <CardHeader
      title={title}
      subheader={subheader}
      action={action}
      avatar={avatar}
      titleTypographyProps={{
        variant: 'h6',
        fontWeight: 600,
      }}
      subheaderTypographyProps={{
        variant: 'body2',
        color: 'text.secondary',
      }}
      sx={{
        pb: 2,
      }}
      {...props}
    />
  );
};

/**
 * Card Content
 */
Card.Content = function CardContentComponent({
  children,
  noPadding = false,
  ...props
}) {
  return (
    <CardContent
      sx={{
        p: noPadding ? 0 : { xs: 2, sm: 3 },
        '&:last-child': {
          pb: noPadding ? 0 : { xs: 2, sm: 3 },
        },
      }}
      {...props}
    >
      {children}
    </CardContent>
  );
};

/**
 * Card Actions
 */
Card.Actions = function CardActionsComponent({
  children,
  align = 'right', // 'left' | 'right' | 'center' | 'space-between'
  ...props
}) {
  const justifyContent = {
    left: 'flex-start',
    right: 'flex-end',
    center: 'center',
    'space-between': 'space-between',
  }[align];

  return (
    <CardActions
      sx={{
        p: { xs: 2, sm: 3 },
        pt: 0,
        justifyContent,
      }}
      {...props}
    >
      {children}
    </CardActions>
  );
};

// PropTypes
Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['elevation', 'outlined']),
  elevation: PropTypes.number,
  sx: PropTypes.object,
};

Card.Header.propTypes = {
  title: PropTypes.node,
  subheader: PropTypes.node,
  action: PropTypes.node,
  avatar: PropTypes.node,
};

Card.Content.propTypes = {
  children: PropTypes.node.isRequired,
  noPadding: PropTypes.bool,
};

Card.Actions.propTypes = {
  children: PropTypes.node.isRequired,
  align: PropTypes.oneOf(['left', 'right', 'center', 'space-between']),
};
