import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'
import { installErrorLog } from './lib/errorLog'
import { installUsage } from './lib/usage'

installErrorLog() // before anything else, so a crash during boot is still recorded
installUsage() // §26 — one listener, and every tap from here on is counted
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
