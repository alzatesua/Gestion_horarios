// src/app/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import Layout from "../layout/Layout.jsx";
import Login from "../pages/Login.jsx";

// páginas
import Dashboard from "../pages/Dashboard/Dashboard.jsx";
import Marcador from "../pages/Marcador.jsx";
import Horarios from "../pages/Horarios.jsx";
import Metricas from "../pages/Metricas.jsx";
import Roles from "../pages/Roles.jsx";
import Usuarios from "../pages/Usuarios.jsx";
import Estados from "../pages/Estados.jsx";
import AsignarHorarios from "../pages/AsignarHorarios.jsx";
import Asesores from "../pages/Asesores.jsx";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <Toaster
        position="top-right"
        gutter={16}
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '15px',
            fontWeight: '500',
            lineHeight: 1.4,
            padding: '16px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            minWidth: '320px',
          },
          success: { 
            iconTheme: { 
              primary: '#82cc0e', 
              secondary: '#fff' 
            },
            style: {
              background: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }
          },
          error: { 
            iconTheme: { 
              primary: '#ef4444', 
              secondary: '#fff' 
            },
            style: {
              background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff'
            }
          }
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard/*" element={<Dashboard />} />

          <Route path="asignar" element={<AsignarHorarios />} />
          <Route path="asesores" element={<Asesores />} />
          <Route path="marcador" element={<Marcador />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="metricas" element={<Metricas />} />
          <Route path="roles" element={<Roles />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="estados" element={<Estados />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}