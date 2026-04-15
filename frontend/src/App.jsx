import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './app/auth-context.jsx'
import { appRouter } from './app/router.jsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={appRouter} />
    </AuthProvider>
  )
}

export default App
