import { UIProvider } from '@/store/ui-context'
import { AuthProvider } from '@/store/auth-context'
import { AppRouter } from '@/routes/AppRouter'

export default function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </UIProvider>
  )
}
