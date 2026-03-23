import { useState, useEffect, useCallback } from 'react';
import { Inventory as EquipmentIcon } from '@mui/icons-material';
import ExpenseListPage from '../components/ExpenseListPage';
import { getEquipExpenses, createEquipExpense } from '../services/expensesService';

export default function EquipmentExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { expenses: list } = await getEquipExpenses(); setExpenses(list); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values) => { await createEquipExpense(values); await load(); };

  return (
    <ExpenseListPage
      title="Despesas de Equipamento"
      subtitle="Registo de aquisições e despesas com equipamentos"
      icon={EquipmentIcon}
      color="#388e3c"
      breadcrumbs={[{ label: 'Despesas' }, { label: 'Equipamento' }]}
      expenses={expenses}
      loading={loading}
      onAdd={handleAdd}
    />
  );
}
