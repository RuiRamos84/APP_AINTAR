import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Icons from 'lucide-react'
import { Plus } from 'lucide-react'
import { dynamoApi } from '@/core/api/dynamo.api'
import DynamicTable from './DynamicTable'
import DynamicForm from './DynamicForm'
import Modal from '@/shared/ui/Modal'
import Button from '@/shared/ui/Button'
import SearchBar from '@/shared/ui/SearchBar'
import Pagination from '@/shared/ui/Pagination'
import Spinner from '@/shared/ui/Spinner'
import EmptyState from '@/shared/ui/EmptyState'
import { useUiStore } from '@/core/store/uiStore'

export default function DynamicPage({ entityCfg }) {
  // Escape hatch — componente custom substitui tudo
  if (entityCfg.custom) {
    const Custom = lazy(entityCfg.custom)
    return <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}><Custom /></Suspense>
  }

  return <AutoPage entityCfg={entityCfg} />
}

function AutoPage({ entityCfg }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { formModal, openFormModal, closeFormModal, openDeleteModal, deleteModal, closeDeleteModal } = useUiStore()

  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [sort, setSort]       = useState(entityCfg.listView?.defaultSort ?? null)

  const { data, isLoading, isError } = useQuery({
    queryKey: [entityCfg.key, search, page, sort],
    queryFn:  () => dynamoApi.list(entityCfg.key, {
      search, page, per_page: 25,
      sort: sort?.field, dir: sort?.dir,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: (pk) => dynamoApi.remove(entityCfg.key, pk),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entityCfg.key] })
      toast.success(`${entityCfg.label} eliminado.`)
      closeDeleteModal()
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Erro ao eliminar.'),
  })

  const handleSort = (field) =>
    setSort((s) => s?.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })

  const hasDetail = (entityCfg.detailView?.tabs?.length ?? 0) > 0
  const handleView = hasDetail
    ? (record) => navigate(String(record[entityCfg.db.pkField]))
    : undefined

  const Icon = Icons[entityCfg.icon] ?? Icons.Database

  return (
    <div className="space-y-4">
      {/* Header da página */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-500" />
          <h1 className="text-lg font-semibold text-slate-900">{entityCfg.labelPlural}</h1>
          {data?.total != null && (
            <span className="text-xs text-slate-400 font-normal">({data.total})</span>
          )}
        </div>
        <Button size="sm" onClick={() => openFormModal(entityCfg, null, 'create')}>
          <Plus size={14} /> Novo {entityCfg.label}
        </Button>
      </div>

      {/* Barra de pesquisa */}
      {entityCfg.listView?.searchable && (
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={`Pesquisar ${entityCfg.labelPlural?.toLowerCase()}...`} />
      )}

      {/* Tabela */}
      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
      {isError   && <p className="text-sm text-red-500 py-4">Erro ao carregar dados.</p>}
      {!isLoading && !isError && !data?.data?.length && (
        <EmptyState
          title={`Sem ${entityCfg.labelPlural?.toLowerCase()}`}
          description="Clique em + Novo para criar o primeiro registo."
        />
      )}
      {!isLoading && !isError && !!data?.data?.length && (
        <>
          <DynamicTable
            entityCfg={entityCfg}
            data={data.data}
            sort={sort}
            onSort={handleSort}
            onView={handleView}
            onEdit={(record) => openFormModal(entityCfg, record, 'edit')}
            onDelete={(pk) => openDeleteModal(entityCfg.key, pk)}
          />
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      {/* Modal criar / editar */}
      <Modal
        open={formModal.open && formModal.entity?.key === entityCfg.key}
        onClose={closeFormModal}
        title={formModal.mode === 'edit' ? `Editar ${entityCfg.label}` : `Novo ${entityCfg.label}`}
        size="lg"
      >
        <DynamicForm
          entityCfg={entityCfg}
          record={formModal.record}
          mode={formModal.mode}
          onClose={closeFormModal}
        />
      </Modal>

      {/* Modal confirmação de eliminação */}
      <Modal open={deleteModal.open && deleteModal.entity === entityCfg.key} onClose={closeDeleteModal} title="Confirmar eliminação" size="sm">
        <p className="text-sm text-slate-600 mb-4">Tem a certeza que deseja eliminar este registo? Esta acção não pode ser revertida.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={closeDeleteModal}>Cancelar</Button>
          <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteModal.pk)}>
            {deleteMutation.isPending ? 'A eliminar...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
