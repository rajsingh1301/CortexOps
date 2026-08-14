import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DocsPage from './pages/DocsPage';
import DashboardPage from './pages/DashboardPage';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
