import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dynamoApi } from '@/core/api/dynamo.api'
import { useAuth } from '@/core/auth/AuthContext'

const MetaContext = createContext({})

export function MetaProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const { data: meta = {} } = useQuery({
    queryKey:  ['meta'],
    queryFn:   () => dynamoApi.meta(),
    enabled:   isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 min — metadados raramente mudam
  })

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>
}

export const useMeta = () => useContext(MetaContext)

export function useMetaOptions(metaKey) {
  const meta = useMeta()
  return (meta[metaKey] ?? []).map((item) => ({
    value: item.pk ?? item.value ?? item.id,
    label: item.name ?? item.label ?? item.description ?? String(item.pk),
  }))
}
