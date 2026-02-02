import React, { useState, useEffect } from 'react';
import { Chip, CircularProgress } from '@mui/material';
import { BeachAccess as VacationIcon } from '@mui/icons-material';
import { documentsService } from '../../api/documentsService';

/**
 * Inline badge that shows vacation status for a user
 * Returns null if user is available, shows "Férias" chip if on vacation
 */
const VacationWarningBadge = ({ userId, userName, size = 'small' }) => {
  const [vacationStatus, setVacationStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const checkStatus = async () => {
      setLoading(true);
      try {
        const result = await documentsService.checkVacationStatus(userId);
        if (!cancelled) {
          setVacationStatus(typeof result === 'object' ? result.vacation_status : result);
        }
      } catch (err) {
        console.error('Erro ao verificar férias:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <CircularProgress size={16} />;
  }

  if (vacationStatus === 1) {
    return (
      <Chip
        icon={<VacationIcon />}
        label="Férias"
        color="warning"
        size={size}
        variant="outlined"
        title={`${userName || 'Utilizador'} está de férias`}
      />
    );
  }

  return null;
};

export default VacationWarningBadge;
