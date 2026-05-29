import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dynamoApi } from '@/core/api/dynamo.api'
import DynamicTable from './DynamicTable'
import SearchBar from '@/shared/ui/SearchBar'
import Pagination from '@/shared/ui/Pagination'
import Spinner from '@/shared/ui/Spinner'
import EmptyState from '@/shared/ui/EmptyState'
import appConfig from '@/config/app.config'

export default function RelationTab({ parentEntityCfg, parentPk, relationKey }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(null)

  const relationCfg = parentEntityCfg.relations?.[relationKey]
  const childEntityCfg = appConfig.entities[relationCfg?.entity]

  const { data, isLoading, isError } = useQuery({
    queryKey: [parentEntityCfg.key, parentPk, relationKey, search, page, sort],
    queryFn:  () => dynamoApi.listRelated(parentEntityCfg.key, parentPk, relationKey, {
      search, page, per_page: 25,
      sort: sort?.field, dir: sort?.dir,
    }),
    enabled: !!childEntityCfg,
  })

  if (!childEntityCfg) return <p className="text-sm text-red-500">Entidade filho não encontrada: {relationCfg?.entity}</p>
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>
  if (isError)   return <p className="text-sm text-red-500 py-4">Erro ao carregar dados.</p>

  const handleSort = (field) =>
    setSort((s) => s?.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })

  return (
    <div className="space-y-3">
      {childEntityCfg.listView?.searchable && (
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1) }} />
      )}
      {!data?.data?.length
        ? <EmptyState title={`Sem ${childEntityCfg.labelPlural?.toLowerCase()}`} />
        : <DynamicTable entityCfg={childEntityCfg} data={data.data} sort={sort} onSort={handleSort} />
      }
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
    </div>
  )
}
