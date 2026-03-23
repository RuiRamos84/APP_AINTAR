import { useState, useEffect, useCallback } from 'react';
import { AccountTree as BranchIcon } from '@mui/icons-material';
import ExpenseListPage from '../components/ExpenseListPage';
import { getRamalExpenses, createRamalExpense } from '../services/expensesService';

export default function BranchesExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { expenses: list } = await getRamalExpenses(); setExpenses(list); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values) => { await createRamalExpense(values); await load(); };

  return (
    <ExpenseListPage
      title="Despesas de Ramais"
      subtitle="Registo de despesas em ramais domiciliários"
      icon={BranchIcon}
      color="#7b1fa2"
      breadcrumbs={[{ label: 'Despesas' }, { label: 'Ramais' }]}
      expenses={expenses}
      loading={loading}
      onAdd={handleAdd}
    />
  );
}
