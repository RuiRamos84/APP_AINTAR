/**
 * ObrasPage — Módulo independente de gestão de obras.
 *
 * Tabs:
 *  0 - Obras (lista global, criar/editar/eliminar)
 *  1 - Despesas de Obra (lista global, criar/editar)
 */
import { useState } from 'react';
import { Box, Button, Fab, Tab, Tabs } from '@mui/material';
import {
  Add as AddIcon,
  Construction as ObrasIcon,
  Euro as EuroIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { SearchBar } from '@/shared/components/data';
import { useObras } from '../hooks/useObras';
import { ObrasList, ObrasForm, DespesasTab } from '../components';
import { usePermissions } from '@/core/contexts/PermissionContext';

export default function ObrasPage() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('obras.edit');

  const {
    filteredObras, obras, loading, meta,
    filters, setFilter,
    fetchObras,
    createObra, updateObra, deleteObra,
  } = useObras();

  const [tab, setTab] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleEdit = (obra) => {
    setEditTarget(obra);
    setFormOpen(true);
  };

  const handleDelete = async (obra) => {
    if (!window.confirm(`Eliminar a obra "${obra.nome}"?`)) return;
    await deleteObra(obra.id);
  };

  const handleFormSubmit = async (data) => {
    if (editTarget) {
      await updateObra(editTarget.id, data);
    } else {
      await createObra(data);
    }
    setFormOpen(false);
    setEditTarget(null);
  };

  const actions = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {tab === 0 && (
        <>
          <SearchBar
            searchTerm={filters.search}
            onSearch={(val) => setFilter('search', val)}
          />
          {canEdit && (
            <Button
              variant="contained" startIcon={<AddIcon />} size="small"
              sx={{ whiteSpace: 'nowrap' }}
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
            >
              Nova Obra
            </Button>
          )}
        </>
      )}
    </Box>
  );

  return (
    <ModulePage
      title="Obras"
      subtitle="Gestão de obras e requalificações"
      icon={ObrasIcon}
      color="#4caf50"
      breadcrumbs={[{ label: 'Obras' }]}
      actions={actions}
    >
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label="Obras"
            icon={<ObrasIcon fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
          />
          <Tab
            label="Despesas de Obra"
            icon={<EuroIcon fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
          />
        </Tabs>
      </Box>

      {/* Tab 0: Obras */}
      {tab === 0 && (
        <Box sx={{ position: 'relative' }}>
          <ObrasList
            obras={filteredObras}
            loading={loading}
            onEdit={canEdit ? handleEdit : null}
            onDelete={canEdit ? handleDelete : null}
          />

          {/* FAB mobile */}
          {canEdit && (
            <Fab
              color="primary" size="small"
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
      )}

      {/* Tab 1: Despesas */}
      {tab === 1 && (
        <DespesasTab
          meta={meta}
          canEdit={canEdit}
          obras={obras}
        />
      )}

      {/* Dialog criar/editar obra */}
      <ObrasForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        obra={editTarget}
        meta={meta}
      />
    </ModulePage>
  );
}
