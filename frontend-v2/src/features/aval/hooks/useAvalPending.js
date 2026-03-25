import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import avalService from '../services/avalService';

const SESSION_KEY = 'aval_pending_dismissed';

export const useAvalPending = () => {
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  const { data } = useQuery({
    queryKey: ['aval-pending'],
    queryFn: () => avalService.getPending(),
    staleTime: 60 * 1000,
    enabled: !dismissed,
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
