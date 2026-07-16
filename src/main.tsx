import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { checkForNewVersion } from './utils/versionCheck'

async function bootstrap() {
  await checkForNewVersion()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  window.__ERA_APP_MOUNTED__ = true
  sessionStorage.removeItem('era-asset-reload')
}

void bootstrap()
