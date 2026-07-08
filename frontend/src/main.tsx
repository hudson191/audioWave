import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design-system/fonts.css'
import './design-system/tokens.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root não encontrado no documento')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
