import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import Layout from '@/pages/Layout'
import AdminDashboard from '@/pages/AdminDashboard'
import SuperAdminDashboard from '@/pages/SuperAdminDashboard'
import SportsCalendar from '@/pages/SportsCalendar'
import Channels from '@/pages/Channels'
import Sites from '@/pages/Sites'
import SiteView from '@/pages/SiteView'
import Users from '@/pages/Users'
import Settings from '@/pages/Settings'
import SiteDisplay from '@/pages/SiteDisplay'
import BrandSchemes from '@/pages/BrandSchemes'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/site-display" element={<SiteDisplay />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout currentPageName="AdminDashboard">
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/AdminDashboard"
              element={
                <ProtectedRoute>
                  <Layout currentPageName="AdminDashboard">
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/SuperAdminDashboard"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <Layout currentPageName="SuperAdminDashboard">
                    <SuperAdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/SportsCalendar"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout currentPageName="SportsCalendar">
                    <SportsCalendar />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/Channels"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout currentPageName="Channels">
                    <Channels />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/Sites"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout currentPageName="Sites">
                    <Sites />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/BrandSchemes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout currentPageName="BrandSchemes">
                    <BrandSchemes />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/Users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Layout currentPageName="Users">
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/SiteView"
              element={
                <ProtectedRoute>
                  <Layout currentPageName="SiteView">
                    <SiteView />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/Settings"
              element={
                <ProtectedRoute>
                  <Layout currentPageName="Settings">
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App 