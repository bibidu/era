import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { recoverPreviewUrlInBrowser } from './agent/supabaseHighlightSetup'
import { applyTheme, readStoredTheme } from './theme/theme'
import { checkForNewVersion } from './utils/versionCheck'

applyTheme(readStoredTheme())

function bootstrap() {
  // 聊天/跳转偶发把整段 query 二次编码；必须在读 tab/shareId 前还原
  recoverPreviewUrlInBrowser()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  window.__ERA_APP_MOUNTED__ = true
  sessionStorage.removeItem('era-asset-reload')
  void checkForNewVersion()
}

bootstrap()
