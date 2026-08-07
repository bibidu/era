import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import App from './App.tsx'
import { AuthGate } from './features/auth/AuthGate.tsx'
import { recoverPreviewUrlInBrowser } from './agent/supabaseHighlightSetup'
import { applyTheme, readStoredTheme } from './theme/theme'
import { ensureRandomUUID } from './utils/id'
import { checkForNewVersion } from './utils/versionCheck'

// HTTP 自建站无 secure context，须在加载图文等模块前补齐 randomUUID
ensureRandomUUID()
applyTheme(readStoredTheme())

function bootstrap() {
  // 聊天/跳转偶发把整段 query 二次编码；必须在读 tab/shareId 前还原
  recoverPreviewUrlInBrowser()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthGate>
        <App />
      </AuthGate>
    </StrictMode>,
  )
  window.__ERA_APP_MOUNTED__ = true
  sessionStorage.removeItem('era-asset-reload')
  void checkForNewVersion()
}

bootstrap()
