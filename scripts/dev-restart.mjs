import http from 'node:http'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

function findListeningPids(targetPort) {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
    cwd: rootDir,
    encoding: 'utf8',
  })

  const pids = new Set()
  const patterns = [`:${targetPort} `, `:${targetPort}\r`]

  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue
    if (!patterns.some((pattern) => line.includes(pattern))) continue

    const parts = line.trim().split(/\s+/)
    const pid = parts.at(-1)
    if (pid && /^\d+$/.test(pid)) {
      pids.add(pid)
    }
  }

  return [...pids]
}

function waitForHealthy(url, timeoutMs = 20000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, { timeout: 1500 }, (res) => {
        res.resume()
        if (res.statusCode && res.statusCode < 500) {
          resolve(true)
          return
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`))
          return
        }

        setTimeout(tick, 800)
      })

      req.on('timeout', () => {
        req.destroy()
      })

      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`))
          return
        }

        setTimeout(tick, 800)
      })
    }

    tick()
  })
}

async function main() {
  const pids = findListeningPids(port)

  for (const pid of pids) {
    console.log(`[dev:restart] Stopping process ${pid} on port ${port}...`)
    execFileSync('taskkill', ['/PID', pid, '/F'], {
      cwd: rootDir,
      stdio: 'ignore',
    })
  }

  console.log('[dev:restart] Starting stable dev server...')
  const child = spawn(
    process.execPath,
    [path.join(rootDir, 'scripts', 'dev-stable.mjs')],
    {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      detached: true,
    }
  )
  child.unref()

  await waitForHealthy(`http://${host}:${port}/landing`)
  console.log(`[dev:restart] Dev server is healthy at http://${host}:${port}/landing`)
}

main().catch((error) => {
  console.error('[dev:restart] Failed to restart the dev server.')
  console.error(error)
  process.exit(1)
})
