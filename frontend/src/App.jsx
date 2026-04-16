import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/auth-context.jsx'
import { AppQueryProvider } from './app/query-provider.jsx'
import { appRouter } from './app/router.jsx'
import './App.css'

function App() {
  return (
    <AppQueryProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </AppQueryProvider>
  )
}

export default App
