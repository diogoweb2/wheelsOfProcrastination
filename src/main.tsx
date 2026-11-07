import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { installErrorLog } from './lib/errorLog'
import { installUsage } from './lib/usage'
import { installFreshen } from './lib/fresh'

installErrorLog() // before anything else, so a crash during boot is still recorded
installUsage() // §26 — one listener, and every tap from here on is counted
installFreshen() // the page keeps itself on the live build — the shell never reloads it

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
