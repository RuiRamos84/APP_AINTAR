/**
 * Button Component - Atómico
 * Botão reutilizável com suporte mobile-first e acessibilidade
 */

import { Button as MuiButton, CircularProgress } from '@mui/material';
import { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Botão customizado baseado em Material-UI
 * - Touch-friendly (44px mínimo)
 * - Loading state
 * - Acessível (ARIA)
 * - Responsivo
 */
export const Button = forwardRef(({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  return (
    <MuiButton
      ref={ref}
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      startIcon={loading ? null : startIcon}
      endIcon={loading ? null : endIcon}
      onClick={onClick}
      type={type}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      sx={{
        // Touch-friendly sizes
        minHeight: size === 'small' ? 36 : size === 'large' ? 56 : 44,
        // Mobile-first padding
        px: { xs: 2, sm: 3 },
        py: { xs: 1, sm: 1.5 },
        // Smooth transitions
        transition: 'all 0.2s ease-in-out',
        // Prevent text selection
        userSelect: 'none',
        ...props.sx,
      }}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress
            size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
            color="inherit"
            sx={{ mr: 1 }}
          />
          A processar...
        </>
      ) : (
        children
      )}
    </MuiButton>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['text', 'outlined', 'contained']),
  color: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  'aria-label': PropTypes.string,
};
