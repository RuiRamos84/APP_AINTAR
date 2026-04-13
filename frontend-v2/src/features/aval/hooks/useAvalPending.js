import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import avalService from '../services/avalService';
import { usePermissions } from '@/core/contexts/PermissionContext';

const SESSION_KEY = 'aval_pending_dismissed';

export const useAvalPending = () => {
  const { hasPermission } = usePermissions();
  const canView = hasPermission('aval.view');
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  const { data } = useQuery({
    queryKey: ['aval-pending'],
    queryFn: () => avalService.getPending(),
    staleTime: 60 * 1000,
    enabled: canView && !dismissed,
    retry: false,
  });

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setDismissed(true);
  };

  return {
    data,
    open: !dismissed && !!data?.has_pending,
    dismiss,
  };
};
