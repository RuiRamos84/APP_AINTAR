import { useState, useEffect, useRef } from 'react';
import { checkEntrada } from '../services/rhService';

// sessionStorage: limpa quando a página é recarregada (logout redireciona → limpa)
const SNOOZE_KEY = 'ponto_check_snoozed_until';
const SNOOZE_MS  = 30 * 60 * 1000;   // 30 minutos
const CHECK_EVERY = 15 * 60 * 1000;  // verifica a cada 15 minutos

export function usePontoCheckIn(enabled = true) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const openRef    = useRef(false);
  const enabledRef = useRef(enabled);

  openRef.current    = open;
  enabledRef.current = enabled;

  useEffect(() => {
    const doCheck = async () => {
      if (!enabledRef.current) return;  // permissão ainda não carregada
      if (openRef.current) return;      // modal já aberto

      const snoozedUntil = Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
      if (Date.now() < snoozedUntil) return;

      try {
        const res = await checkEntrada();
        if (res?.needs_check) {
          setData(res);
          setOpen(true);
        }
      } catch {
        // falha silenciosa — não bloquear a app
      }
    };

    // Primeira verificação 2 s após montar
    const initTimer = setTimeout(doCheck, 2000);
    // Verificações periódicas a cada 15 min
    const interval = setInterval(doCheck, CHECK_EVERY);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // monta uma vez — enabled lido via ref para não reiniciar timers

  /** "Mais Tarde" — snooze 30 min */
  const dismiss = () => {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setOpen(false);
    setData(null);
  };

  /** Chamado após registo bem-sucedido — fecha e deixa o próximo ciclo decidir */
  const onRegistered = () => {
    setOpen(false);
    setData(null);
    // Não guarda snooze: o próximo doCheck irá verificar imediatamente
    // se há mais eventos em falta (ex: Entrada feita → verifica almoço)
  };

  return { open, data, dismiss, onRegistered };
}
