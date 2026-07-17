/**
 * Transações SIBS iniciadas neste browser.
 *
 * O webhook SIBS não sabe que utilizador iniciou o pagamento, por isso o
 * backend faz broadcast de 'payment_status_update' para todos os clientes
 * ligados. Este registo permite ao handler global (SocketContext) reagir
 * apenas às transações deste browser — sem ele, qualquer utilizador via
 * o toast "Pagamento confirmado" de pagamentos alheios.
 *
 * sessionStorage: sobrevive a refresh a meio do pagamento, morre com o separador.
 */
const KEY = 'sibs_pending_transactions';

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

const write = (ids) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // sessionStorage indisponível (modo privado antigo) — perde-se só o toast global
  }
};

export const registerPendingTransaction = (transactionId) => {
  if (!transactionId) return;
  const ids = read();
  if (!ids.includes(transactionId)) write([...ids, transactionId]);
};

export const isPendingTransaction = (transactionId) =>
  !!transactionId && read().includes(transactionId);

export const clearPendingTransaction = (transactionId) => {
  if (!transactionId) return;
  write(read().filter((id) => id !== transactionId));
};
