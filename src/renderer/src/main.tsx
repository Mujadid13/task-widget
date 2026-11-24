import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyAccent, loadAccent } from './lib/theme'

applyAccent(loadAccent()) // before the first paint, so the saved color shows without a flash

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
