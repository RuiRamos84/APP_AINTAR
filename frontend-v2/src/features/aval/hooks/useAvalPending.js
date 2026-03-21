import { useState, useEffect } from 'react';
import avalService from '../services/avalService';

const SESSION_KEY = 'aval_pending_dismissed';

export const useAvalPending = () => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    avalService.getPending()
      .then((res) => {
        if (res?.has_pending) {
          setData(res);
          setOpen(true);
        }
      })
      .catch(() => {
        // falha silenciosa — não interrompe a navegação
      });
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
  };

  return { data, open, dismiss };
};
