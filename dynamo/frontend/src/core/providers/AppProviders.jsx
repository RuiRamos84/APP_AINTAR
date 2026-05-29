import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/core/auth/AuthContext'
import { MetaProvider } from '@/core/meta/MetaContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          2 * 60 * 1000,
      retry:              1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MetaProvider>
          {children}
          <Toaster position="top-right" richColors />
        </MetaProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
