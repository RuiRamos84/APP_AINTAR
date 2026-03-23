import { useState, useEffect, useCallback } from 'react';
import { Hub as NetworkIcon } from '@mui/icons-material';
import ExpenseListPage from '../components/ExpenseListPage';
import { getRedeExpenses, createRedeExpense } from '../services/expensesService';

export default function NetworkExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { expenses: list } = await getRedeExpenses(); setExpenses(list); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values) => { await createRedeExpense(values); await load(); };

  return (
    <ExpenseListPage
      title="Despesas de Rede"
      subtitle="Registo de despesas na rede de saneamento"
      icon={NetworkIcon}
      color="#0288d1"
      breadcrumbs={[{ label: 'Despesas' }, { label: 'Rede' }]}
      expenses={expenses}
      loading={loading}
      onAdd={handleAdd}
    />
  );
}
