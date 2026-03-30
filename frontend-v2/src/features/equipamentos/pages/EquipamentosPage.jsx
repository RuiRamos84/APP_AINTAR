import { useState } from 'react';
import { Box, Button, Fab } from '@mui/material';
import { Add as AddIcon, Build as BuildIcon } from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { SearchBar } from '@/shared/components/data';
import { useEquipamentos } from '../hooks/useEquipamentos';
import { EquipamentoList, EquipamentoForm, EquipamentoDetail } from '../components';
import { usePermissions } from '@/core/contexts/PermissionContext';

export default function EquipamentosPage() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('equipamentos.edit');
  const canEdit = hasPermission('equipamentos.edit');
  const canDelete = hasPermission('equipamentos.edit');

  const {
    filteredEquipamentos, loading, meta,
    detailOpen, selectedEquipamento,
    filters, setFilter,
    setSelectedEquipamento, closeDetail,
    fetchEquipamentos,
    createEquipamento, updateEquipamento, deleteEquipamento,
  } = useEquipamentos();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleEdit = (eq) => {
    setEditTarget(eq);
    setFormOpen(true);
  };

  const handleDelete = async (eq) => {
    if (!window.confirm(`Eliminar "${eq.marca} ${eq.modelo}"?`)) return;
    await deleteEquipamento(eq.id);
  };

  const handleFormSubmit = async (data) => {
    if (editTarget) {
      await updateEquipamento(editTarget.id, data);
    } else {
      await createEquipamento(data);
    }
    setFormOpen(false);
    setEditTarget(null);
  };

  return (
    <ModulePage
      title="Equipamentos"
      subtitle="Gestão de equipamentos e histórico de alocações"
      icon={BuildIcon}
      color="#4caf50"
      breadcrumbs={[{ label: 'Equipamentos' }]}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchBar
            searchTerm={filters.search}
            onSearch={(val) => setFilter('search', val)}
          />
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
              size="small"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Novo Equipamento
            </Button>
          )}
        </Box>
      }
    >
      <Box sx={{ position: 'relative' }}>
        <EquipamentoList
          equipamentos={filteredEquipamentos}
          loading={loading}
          onSelect={setSelectedEquipamento}
          onEdit={canEdit ? handleEdit : null}
          onDelete={canDelete ? handleDelete : null}
        />

        {/* FAB mobile */}
        {canCreate && (
          <Fab
            color="primary"
            size="small"
            sx={{
              position: 'fixed', bottom: { xs: 80, sm: 24 }, right: 24,
              display: { sm: 'none' },
            }}
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {/* Painel de detalhe */}
      <EquipamentoDetail
        open={detailOpen}
        onClose={closeDetail}
        equipamento={selectedEquipamento}
        meta={meta}
        canEdit={canEdit}
        onEdit={handleEdit}
        onAlocChange={fetchEquipamentos}
      />

      {/* Form criar/editar */}
      <EquipamentoForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        equipamento={editTarget}
        tipos={meta?.tipos ?? []}
      />
    </ModulePage>
  );
}
