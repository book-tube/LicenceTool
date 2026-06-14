import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainApp } from './MainApp';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root wurde nicht gefunden.');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
