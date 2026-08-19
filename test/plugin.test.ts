import test from 'node:test'
import assert from 'node:assert/strict'
import { apply } from '../src/plugin.js'

type Handler = (invocation: { rawInput?: string }) => Promise<{ kind: string; text: string }>

function capture(config: unknown = {}) {
  const commands: Record<string, Handler> = {}
  apply({ commands: { register: (d: { name: string; handler: Handler }) => { commands[d.name] = d.handler } } } as never, config as never)
  return commands
}

test('dev-start registers through the supervisor', async () => {
  const started: string[] = []
  const handlers = capture({
    supervisor: {
      start: async (command: string) => { started.push(command); return { pid: 123 } },
      stop: async () => {},
      logs: async () => '',
    },
  })
  const result = await handlers['dev-start']!({ rawInput: 'web npm run dev' })
  assert.equal(result.kind, 'success')
  assert.deepEqual(started, ['npm run dev'])
  assert.match(result.text, /"id": "web"/)
})

test('dev-start blocks compound shell syntax', async () => {
  const handlers = capture({
    supervisor: { start: async () => ({}), stop: async () => {}, logs: async () => '' },
  })
  const result = await handlers['dev-start']!({ rawInput: 'web npm run dev && rm -rf /' })
  assert.equal(result.kind, 'error')
  assert.match(result.text, /compound shell/)
})

test('dev-stop reports unknown server ids', async () => {
  const handlers = capture({ supervisor: { start: async () => ({}), stop: async () => {}, logs: async () => '' } })
  const result = await handlers['dev-stop']!({ rawInput: 'nope' })
  assert.equal(result.kind, 'error')
})
