import { Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import Input from '@/shared/ui/Input'
import Select from '@/shared/ui/Select'
import { useMetaOptions } from '@/core/meta/MetaContext'
import { dynamoApi } from '@/core/api/dynamo.api'
import appConfig from '@/config/app.config'

function RelationSelect({ field, control, error }) {
  const { entity: entityKey, displayField } = field.relation
  const entityCfg = appConfig.entities[entityKey]

  const { data } = useQuery({
    queryKey:  ['relation', entityKey],
    queryFn:   () => dynamoApi.list(entityKey, { per_page: 200 }),
    staleTime: 5 * 60 * 1000,
    enabled:   !!entityCfg,
  })

  const options = (data?.data ?? []).map((r) => ({
    value: r[entityCfg?.db?.pkField ?? 'pk'],
    label: r[displayField] ?? r.name ?? r.pk,
  }))

  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: f }) => (
        <Select label={field.label} error={error} options={options} value={f.value ?? ''} onChange={f.onChange} />
      )}
    />
  )
}

function MetaSelect({ field, control, error }) {
  const options = useMetaOptions(field.meta)
  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: f }) => (
        <Select label={field.label} error={error} options={options} value={f.value ?? ''} onChange={f.onChange} />
      )}
    />
  )
}

export default function FieldRenderer({ field, register, control, errors }) {
  if (field.type === 'id') return null
  const error = errors?.[field.key]?.message

  if (field.type === 'relation') {
    return <RelationSelect field={field} control={control} error={error} />
  }
  if (field.type === 'select') {
    return <MetaSelect field={field} control={control} error={error} />
  }
  if (field.type === 'boolean') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">{field.label}</label>
        <div className="flex items-center gap-2 h-9">
          <input type="checkbox" id={field.key} {...register(field.key)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
          <label htmlFor={field.key} className="text-sm text-slate-700">{field.label}</label>
        </div>
      </div>
    )
  }
  if (field.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">{field.label}</label>
        <textarea
          {...register(field.key)}
          rows={3}
          readOnly={field.readonly}
          className={`w-full rounded-md border px-3 py-2 text-sm bg-white resize-none
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${error ? 'border-red-400' : 'border-slate-300'}
            ${field.readonly ? 'bg-slate-50 text-slate-400' : ''}`}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  const inputType = { date: 'date', datetime: 'datetime-local', number: 'number' }[field.type] ?? 'text'
  return (
    <Input
      label={field.label}
      type={inputType}
      error={error}
      readOnly={field.readonly}
      className={field.readonly ? 'bg-slate-50 text-slate-400' : ''}
      {...register(field.key)}
    />
  )
}
