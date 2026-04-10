import { useState } from 'react';
import { Box, Typography, Button, IconButton, Stack, Chip, Grid, TextField, Tooltip } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, CheckCircle as PaidIcon, RemoveCircle as UnpaidIcon, Undo as UndoIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers';
import notification from '@/core/services/notification';
import apiClient from '@/services/api/client';
import DataTable from '@/shared/components/data/DataTable/DataTable';
import ConfirmDialog from '@/shared/components/feedback/ConfirmDialog';
import { usePermissions } from '@/core/contexts/PermissionContext';

export const ContractInvoicesList = ({ contract }) => {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const contractId = contract.pk;
  
  const [isAdding, setIsAdding] = useState(false);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState(null);

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['contract-payments', contractId],
    queryFn: () => apiClient.get(`/clients/contracts/${contractId}/payments`).then(r => r.payments || []),
    enabled: !!contractId,
  });

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { start_date: null, stop_date: null, value: '', presented: true, payed: false }
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post(`/clients/contracts/${contractId}/payments`, data),
    onSuccess: () => {
      notification.success('Registo financeiro adicionado!');
      queryClient.invalidateQueries(['contract-payments', contractId]);
      setIsAdding(false);
      reset();
    },
    onError: (err) => notification.apiError(err, 'Erro ao adicionar registo.'),
  });

  const togglePayedMutation = useMutation({
    mutationFn: ({ pk, currentPayed }) => apiClient.put(`/clients/contracts/payments/${pk}`, { payed: !currentPayed }),
    onSuccess: () => {
      notification.success('Estado atualizado!');
      queryClient.invalidateQueries(['contract-payments', contractId]);
    },
    onError: (err) => notification.apiError(err, 'Erro ao alterar estado de pagamento.')
  });

  const deleteMutation = useMutation({
    mutationFn: (pk) => apiClient.delete(`/clients/contracts/payments/${pk}`),
    onSuccess: () => {
      notification.success('Registo eliminado!');
      queryClient.invalidateQueries(['contract-payments', contractId]);
      setDeleteInvoiceId(null);
    },
    onError: (err) => { notification.apiError(err, 'Erro ao eliminar o registo.'); setDeleteInvoiceId(null); }
  });

  const onSubmit = (data) => {
    const payload = { ...data };
    if (payload.start_date) payload.start_date = payload.start_date.toISOString();
    if (payload.stop_date) payload.stop_date = payload.stop_date.toISOString();
    payload.value = parseFloat(payload.value) || 0;
    createMutation.mutate(payload);
  };

  const columns = [
    { 
      id: 'period', 
      label: 'Período a Faturar', 
      minWidth: 150,
      render: (_, row) => (
        <Typography variant="body2">
          {new Date(row.start_date).toLocaleDateString('pt-PT')} a {new Date(row.stop_date).toLocaleDateString('pt-PT')}
        </Typography>
      )
    },
    { 
      id: 'value', 
      label: 'Valor', 
      minWidth: 100,
      render: (v) => <Typography variant="body2" fontWeight="bold">{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v || 0)}</Typography>
    },
    { 
      id: 'payed', 
      label: 'Estado Pago', 
      minWidth: 120,
      render: (v, row) => (
        <Chip 
          size="small" 
          icon={v ? <PaidIcon /> : <UnpaidIcon />} 
          label={v ? 'Pago' : 'Pendente'} 
          color={v ? 'success' : 'warning'} 
          onClick={hasPermission('payments.manage') ? () => togglePayedMutation.mutate({ pk: row.pk, currentPayed: v }) : undefined}
          sx={{ cursor: hasPermission('payments.manage') ? 'pointer' : 'default' }}
        />
      )
    },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 80,
      align: 'right',
      render: (_, row) => hasPermission('payments.manage') ? (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title={row.payed ? "Reverter para Pendente" : "Marcar como Pago"}>
            <IconButton
              size="small"
              color={row.payed ? "warning" : "success"}
              onClick={(e) => {
                e.stopPropagation();
                togglePayedMutation.mutate({ pk: row.pk, currentPayed: row.payed });
              }}
              disabled={togglePayedMutation.isPending}
            >
              {row.payed ? <UndoIcon fontSize="small" /> : <PaidIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Apagar Registo">
            <IconButton 
              size="small" 
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteInvoiceId(row.pk);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null
    }
  ];

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, m: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          Histórico de Faturas / Períodos
        </Typography>
        {hasPermission('payments.manage') && !isAdding && (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setIsAdding(true)}>
            Adicionar Registo
          </Button>
        )}
      </Stack>

      {isAdding && (
        <Box sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Controller name="start_date" control={control} render={({ field }) => (
                <DatePicker label="Data Início" value={field.value} onChange={field.onChange} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              )} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller name="stop_date" control={control} render={({ field }) => (
                <DatePicker label="Data Fim" value={field.value} onChange={field.onChange} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              )} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller name="value" control={control} render={({ field }) => (
                <TextField {...field} type="number" label="Valor (€)" size="small" fullWidth />
              )} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending}>
                  Salvar
                </Button>
                <Button variant="text" size="small" color="inherit" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}

      {payments.length === 0 && !isLoading && !isAdding ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Sem histórico registado.
        </Typography>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          loading={isLoading}
          error={error}
          paginationMode="client"
        />
      )}

      {/* Confirmação de Apagar */}
      <ConfirmDialog
        open={Boolean(deleteInvoiceId)}
        title="Apagar Registo?"
        message="Tem a certeza que deseja eliminar esta fatura/registo? Esta operação é irreversível."
        confirmText="Apagar Registo"
        cancelText="Cancelar"
        confirmColor="error"
        type="error"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteInvoiceId)}
        onCancel={() => setDeleteInvoiceId(null)}
      />
    </Box>
  );
};
