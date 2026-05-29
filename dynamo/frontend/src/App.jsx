import { BrowserRouter } from 'react-router-dom'
import AppProviders from '@/core/providers/AppProviders'
import DynamicRouter from '@/engine/DynamicRouter'

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <DynamicRouter />
      </AppProviders>
    </BrowserRouter>
  )
}
