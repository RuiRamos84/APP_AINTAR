import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { buildZodSchema } from './zodSchemaBuilder'
import FieldRenderer from './FieldRenderer'
import Button from '@/shared/ui/Button'
import { dynamoApi } from '@/core/api/dynamo.api'
import { engine } from './index'

export default function DynamicForm({ entityCfg, record, mode = 'create', onClose }) {
  const qc = useQueryClient()
  const isEdit = mode === 'edit' && !!record

  const formFields = entityCfg.formView?.sections?.flatMap((s) =>
    s.fields.map((key) => entityCfg.fields.find((f) => f.key === key)).filter(Boolean)
  ) ?? entityCfg.fields.filter((f) => f.type !== 'id')

  const schema = buildZodSchema(formFields)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit ? engine.recordToFormValues(formFields, record) : {},
  })

  useEffect(() => {
    reset(isEdit ? engine.recordToFormValues(formFields, record) : {})
  }, [record, mode])

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? dynamoApi.update(entityCfg.key, record[entityCfg.db.pkField], data)
        : dynamoApi.create(entityCfg.key, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entityCfg.key] })
      toast.success(isEdit ? `${entityCfg.label} actualizado.` : `${entityCfg.label} criado.`)
      onClose?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || err.message || 'Erro ao guardar.')
    },
  })

  const sections = entityCfg.formView?.sections ?? [{ title: null, fields: formFields.map((f) => f.key), cols: 2 }]

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      {sections.map((section, si) => {
        const sectionFields = section.fields
          .map((key) => entityCfg.fields.find((f) => f.key === key))
          .filter(Boolean)
          .filter((f) => f.type !== 'id' && !(isEdit && f.readonly))

        const cols = section.cols ?? 2
        return (
          <div key={si}>
            {section.title && (
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{section.title}</h3>
            )}
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {sectionFields.map((field) => (
                <FieldRenderer key={field.key} field={field} register={register} control={control} errors={errors} />
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'A guardar...' : isEdit ? 'Guardar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
