import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createServer, type ViteDevServer } from 'vite'

type ReceivedRequest = { path: string }

async function listen(handler: http.RequestListener) {
  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('无法获取测试服务端口')
  return {
    server,
    target: `http://127.0.0.1:${address.port}`,
  }
}

async function request(port: number, path: string) {
  return new Promise<string>((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => resolve(body))
    }).on('error', reject)
  })
}

test('公共 Brief 与 Broadcast 精确代理到 Node，近似路径仍代理到 Python 且保留路径', async (t) => {
  const cacheDir = await mkdtemp(path.join(tmpdir(), 'aistock-vite-proxy-'))
  let vite: ViteDevServer | undefined
  let nodeServer: http.Server | undefined
  let pythonServer: http.Server | undefined
  const originalApiTarget = process.env.VITE_PROXY_API_TARGET
  const originalAgentTarget = process.env.VITE_PROXY_AGENT_TARGET

  t.after(async () => {
    await vite?.close()
    await Promise.all([nodeServer, pythonServer].filter(Boolean).map((server) => new Promise<void>((resolve) => server!.close(() => resolve()))))
    await rm(cacheDir, { recursive: true, force: true })
    assert.equal(existsSync(cacheDir), false)
    if (originalApiTarget === undefined) delete process.env.VITE_PROXY_API_TARGET
    else process.env.VITE_PROXY_API_TARGET = originalApiTarget
    if (originalAgentTarget === undefined) delete process.env.VITE_PROXY_AGENT_TARGET
    else process.env.VITE_PROXY_AGENT_TARGET = originalAgentTarget
    assert.equal(process.env.VITE_PROXY_API_TARGET, originalApiTarget)
    assert.equal(process.env.VITE_PROXY_AGENT_TARGET, originalAgentTarget)
  })

  const nodeRequests: ReceivedRequest[] = []
  const pythonRequests: ReceivedRequest[] = []
  const node = await listen((req, res) => {
    nodeRequests.push({ path: req.url ?? '' })
    res.end('node')
  })
  const python = await listen((req, res) => {
    pythonRequests.push({ path: req.url ?? '' })
    res.end('python')
  })
  nodeServer = node.server
  pythonServer = python.server
  process.env.VITE_PROXY_API_TARGET = node.target
  process.env.VITE_PROXY_AGENT_TARGET = python.target

  vite = await createServer({
    root: process.cwd(),
    configFile: 'vite.config.ts',
    cacheDir,
    clearScreen: false,
    server: { port: 0 },
  })
  assert.equal(path.normalize(vite.config.cacheDir), path.normalize(cacheDir))
  await vite.listen()
  const address = vite.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('无法获取 Vite 测试端口')

  assert.equal(await request(address.port, '/api/agent/brief/morning/2026-07-25'), 'node')
  assert.equal(await request(address.port, '/api/agent/broadcast/evening/2026-07-25'), 'node')
  assert.equal(await request(address.port, '/api/agent/briefing/morning'), 'python')
  assert.equal(await request(address.port, '/api/agent/broadcasting/evening'), 'python')

  assert.deepEqual(nodeRequests, [
    { path: '/api/agent/brief/morning/2026-07-25' },
    { path: '/api/agent/broadcast/evening/2026-07-25' },
  ])
  assert.deepEqual(pythonRequests, [
    { path: '/api/agent/briefing/morning' },
    { path: '/api/agent/broadcasting/evening' },
  ])
})
