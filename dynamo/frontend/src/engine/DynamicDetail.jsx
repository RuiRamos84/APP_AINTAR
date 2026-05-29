import { useQuery } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import * as Icons from 'lucide-react'
import { dynamoApi } from '@/core/api/dynamo.api'
import RelationTab from './RelationTab'
import DynamicForm from './DynamicForm'
import Modal from '@/shared/ui/Modal'
import Button from '@/shared/ui/Button'
import Spinner from '@/shared/ui/Spinner'
import { useUiStore } from '@/core/store/uiStore'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

function FieldValue({ field, value }) {
  if (value == null || value === '') return <span className="text-slate-400">—</span>
  if (field.type === 'boolean') return <span>{value ? 'Sim' : 'Não'}</span>
  if (field.type === 'date') {
    try { return <span>{format(parseISO(value), 'dd/MM/yyyy', { locale: pt })}</span> }
    catch { return <span>{value}</span> }
  }
  return <span>{String(value)}</span>
}

export default function DynamicDetail({ entityCfg }) {
  const { pk } = useParams()
  const navigate = useNavigate()
  const { formModal, openFormModal, closeFormModal } = useUiStore()

  const { data, isLoading } = useQuery({
    queryKey: [entityCfg.key, pk],
    queryFn:  () => dynamoApi.get(entityCfg.key, pk),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  const record = data?.data

  const detailTabs = entityCfg.detailView?.tabs ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
        <Button size="sm" onClick={() => openFormModal(entityCfg, record, 'edit')}>
          <Pencil size={14} /> Editar
        </Button>
      </div>

      {/* Campos do registo */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {entityCfg.formView?.sections?.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-6 pt-6 border-t border-slate-100' : ''}>
            {section.title && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{section.title}</h3>}
            <dl className="grid gap-4" style={{ gridTemplateColumns: `repeat(${section.cols ?? 2}, minmax(0, 1fr))` }}>
              {section.fields.map((key) => {
                const field = entityCfg.fields.find((f) => f.key === key)
                if (!field || field.type === 'id') return null
                return (
                  <div key={key}>
                    <dt className="text-xs font-medium text-slate-400 mb-0.5">{field.label}</dt>
                    <dd className="text-sm text-slate-900">
                      <FieldValue field={field} value={record?.[key]} />
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        ))}
      </div>

      {/* Tabs de relações */}
      {detailTabs.length > 0 && (
        <Tabs.Root defaultValue={detailTabs[0].relation} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Tabs.List className="flex border-b border-slate-200 bg-slate-50">
            {detailTabs.map((tab) => {
              const Icon = Icons[tab.icon] ?? Icons.List
              return (
                <Tabs.Trigger
                  key={tab.relation}
                  value={tab.relation}
                  className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-slate-500
                    hover:text-slate-800 border-b-2 border-transparent transition-colors
                    data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600"
                >
                  <Icon size={14} /> {tab.label}
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>
          {detailTabs.map((tab) => (
            <Tabs.Content key={tab.relation} value={tab.relation} className="p-4">
              <RelationTab parentEntityCfg={entityCfg} parentPk={pk} relationKey={tab.relation} />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}

      {/* Modal de edição */}
      <Modal
        open={formModal.open && formModal.entity?.key === entityCfg.key}
        onClose={closeFormModal}
        title={`Editar ${entityCfg.label}`}
        size="lg"
      >
        <DynamicForm entityCfg={entityCfg} record={formModal.record} mode="edit" onClose={closeFormModal} />
      </Modal>
    </div>
  )
}
