import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'

function isPortListening(targetPort, targetHost) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const finish = (value) => {
      if (!settled) {
        settled = true
        socket.destroy()
        resolve(value)
      }
    }

    socket.setTimeout(800)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(targetPort, targetHost)
  })
}

function checkHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => {
      res.resume()
      resolve(res.statusCode ? res.statusCode < 500 : false)
    })

    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })

    req.on('error', () => resolve(false))
  })
}

async function main() {
  const baseUrl = `http://${host}:${port}`

  if (await isPortListening(port, host)) {
    const healthy = await checkHealth(`${baseUrl}/landing`)

    if (healthy) {
      console.log(`[dev:stable] A dev server is already responding at ${baseUrl}.`)
      console.log('[dev:stable] Reuse it, or run `npm run dev:restart` if you want a fresh process.')
      process.exit(0)
    }

    console.log(`[dev:stable] Port ${port} is occupied, but the app did not answer normally.`)
    console.log('[dev:stable] Run `npm run dev:restart` to replace the stuck process.')
    process.exit(1)
  }

  const nextBin = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next')
  const isInteractive = Boolean(process.stdout.isTTY && process.stderr.isTTY)
  let stdio = 'inherit'

  if (!isInteractive) {
    const logDir = path.join(rootDir, '.next', 'dev', 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    const outFd = fs.openSync(path.join(logDir, 'dev-server.stdout.log'), 'a')
    const errFd = fs.openSync(path.join(logDir, 'dev-server.stderr.log'), 'a')
    stdio = ['ignore', outFd, errFd]
  }

  const child = spawn(
    process.execPath,
    [nextBin, 'dev', '--webpack', '--hostname', host, '--port', String(port)],
    {
      cwd: rootDir,
      stdio,
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        WATCHPACK_POLLING: 'true',
        CHOKIDAR_USEPOLLING: '1',
      },
    }
  )

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal)
    }
  }

  process.on('SIGINT', forwardSignal)
  process.on('SIGTERM', forwardSignal)

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error('[dev:stable] Failed to start the dev server.')
  console.error(error)
  process.exit(1)
})
