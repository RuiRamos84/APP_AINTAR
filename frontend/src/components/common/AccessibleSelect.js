import React from 'react';
import { Select } from '@mui/material';

/**
 * ACCESSIBLE SELECT WRAPPER
 *
 * Corrige automaticamente o warning de aria-hidden aplicando
 * as props necessárias para evitar que o focus seja bloqueado
 * em elementos descendentes.
 *
 * Uso: Substituir <Select> por <AccessibleSelect> em qualquer lugar
 */
const AccessibleSelect = ({ MenuProps = {}, ...props }) => {
  const accessibleMenuProps = {
    ...MenuProps,
    disableRestoreFocus: true,
    disableAutoFocusItem: true,
    // Preservar outras props personalizadas do MenuProps
  };

  return <Select {...props} MenuProps={accessibleMenuProps} />;
};

export default AccessibleSelect;
