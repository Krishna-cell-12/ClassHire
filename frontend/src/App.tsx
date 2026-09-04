import { AuthProvider } from '@/store/auth-context'
import { AppRouter } from '@/routes/AppRouter'

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
