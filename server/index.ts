import { startAgentServer } from './http.ts'

startAgentServer().catch((error) => {
  console.error(error)
  process.exit(1)
})
