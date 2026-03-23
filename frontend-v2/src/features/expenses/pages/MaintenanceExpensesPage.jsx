import { useState, useEffect, useCallback } from 'react';
import { Build as MaintenanceIcon } from '@mui/icons-material';
import ExpenseListPage from '../components/ExpenseListPage';
import { getManutExpenses, createManutExpense } from '../services/expensesService';

export default function MaintenanceExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { expenses: list } = await getManutExpenses(); setExpenses(list); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values) => { await createManutExpense(values); await load(); };

  return (
    <ExpenseListPage
      title="Despesas de Manutenção"
      subtitle="Registo de material e despesas de manutenção"
      icon={MaintenanceIcon}
      color="#f57c00"
      breadcrumbs={[{ label: 'Despesas' }, { label: 'Manutenção' }]}
      expenses={expenses}
      loading={loading}
      onAdd={handleAdd}
    />
  );
}
