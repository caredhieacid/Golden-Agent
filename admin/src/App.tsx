import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, BarChart3, Settings, LogOut, Menu, X,
  DollarSign, Bell
} from 'lucide-react'

// Pages
import Dashboard from './pages/Dashboard'
import UsersPage from './pages/UsersPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/SettingsPage'

// API
import { authApi, User } from './lib/api'

// Auth context
function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      authApi.getMe()
        .then((userData) => {
          if (userData.role === 'ADMIN' || userData.role === 'VIP') {
            setUser(userData)
          } else {
            localStorage.removeItem('admin_token')
          }
        })
        .catch(() => localStorage.removeItem('admin_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (login: string, password: string) => {
    try {
      const data = await authApi.login(login, password)
      if (data.accessToken) {
        localStorage.setItem('admin_token', data.accessToken)
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: 'Login failed' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('admin_token')
    setUser(null)
  }

  return { user, loading, login, logout }
}

// Login Page
function LoginPage({ onLogin }: { onLogin: (login: string, password: string) => Promise<{ success: boolean; error?: string }> }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await onLogin(login, password)
    if (!result.success) {
      setError(result.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">天枢</h1>
          <p className="text-zinc-400">管理后台登录</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">邮箱 / 用户名</label>
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Layout
function Layout({ children, user, onLogout }: { children: React.ReactNode; user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifications] = useState(0)
  const location = useLocation()

  const navItems = [
    { name: '仪表盘', path: '/', icon: LayoutDashboard },
    { name: '用户管理', path: '/users', icon: Users },
    { name: '流量分析', path: '/analytics', icon: BarChart3 },
    { name: '支付记录', path: '/payments', icon: DollarSign },
    { name: '系统设置', path: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          {sidebarOpen && <span className="text-white font-bold text-lg">天枢后台</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 hover:text-white p-1">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-400 w-full"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-zinc-900/50 border-b border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <h1 className="text-xl font-bold text-white">
            {navItems.find(i => i.path === location.pathname)?.name || '管理后台'}
          </h1>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-white text-sm font-medium">{user.username}</p>
                <p className="text-zinc-500 text-xs">{user.role}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

// Protected Route
function ProtectedRoute({ user, children }: { user: User | null; children: React.ReactNode }) {
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

// Main App
export default function App() {
  const { user, loading, login, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <LoginPage onLogin={login} />
        } />
        <Route path="*" element={
          <ProtectedRoute user={user}>
            <Layout user={user!} onLogout={logout}>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
