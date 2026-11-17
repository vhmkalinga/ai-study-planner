import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StudyProvider } from './context/StudyContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import Progress from './pages/Progress'
import Subjects from './pages/Subjects'
import Settings from './pages/Settings'
import AICoach from './pages/AICoach'

// Logged-in users who open /login or /register go straight to the app.
function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<StudyProvider><Layout /></StudyProvider>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/ai-coach" element={<AICoach />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
