import { spawn } from 'node:child_process'
import { DevServerRegistry, validateDevCommand, type DevServerRecord } from './core.js'

export const name = 'dev-server'
export const inject = ['commands']

export interface DevServerSupervisor {
  start: (command: string) => Promise<{ pid?: number | null } | void> | { pid?: number | null } | void
  stop: (server: DevServerRecord) => Promise<void> | void
  logs: (server: DevServerRecord | undefined) => Promise<string> | string
}

export interface Config {
  supervisor?: DevServerSupervisor
  maxLogLines?: number
}

/** Default supervisor: detached-less spawn with ignored stdio and a bounded line buffer. */
function defaultSupervisor(maxLogLines: number): DevServerSupervisor {
  const buffers = new Map<string, string[]>()
  return {
    start(command) {
      const child = spawn(command, { shell: true, stdio: 'ignore', detached: false })
      const key = String(child.pid ?? Date.now())
      buffers.set(key, [`[dev-server] started: ${command}`])
      return { pid: child.pid ?? null }
    },
    stop(server) {
      if (server.pid != null) {
        try { process.kill(server.pid) } catch { /* already exited */ }
      }
    },
    logs(server) {
      if (!server) return '(no dev server)'
      const key = String(server.pid ?? server.id)
      return (buffers.get(key) ?? []).slice(-maxLogLines).join('\n')
    },
  }
}

export function apply(ctx: any, config: Config = {}): void {
  const registry = new DevServerRegistry()
  const supervisor = config.supervisor ?? defaultSupervisor(config.maxLogLines ?? 200)

  ctx.commands.register({
    name: 'dev-start',
    description: 'Start a long-running development server (no compound shell syntax).',
    input: { hint: '<server-id> <command>' },
    recordInput: false,
    async handler(invocation: any) {
      const [id = '', ...rest] = String(invocation.rawInput ?? '').trim().split(/\s+/)
      const command = rest.join(' ')
      if (!id || !command) return { kind: 'error', text: 'usage: /dev-start <server-id> <command>' }
      try {
        const validated = validateDevCommand(command)
        const handle = await supervisor.start(validated)
        const record = registry.register({ id, command: validated, pid: handle?.pid ?? null })
        return { kind: 'success', text: JSON.stringify(record, null, 2) }
      } catch (error) {
        return { kind: 'error', text: `dev-start failed: ${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })
  ctx.commands.register({
    name: 'dev-list',
    description: 'List registered development servers.',
    recordInput: false,
    async handler() {
      return { kind: 'success', text: JSON.stringify(registry.list(), null, 2) }
    },
  })
  ctx.commands.register({
    name: 'dev-stop',
    description: 'Stop a registered development server.',
    input: { hint: '<server-id>' },
    recordInput: false,
    async handler(invocation: any) {
      const id = String(invocation.rawInput ?? '').trim()
      const item = registry.get(id)
      if (!item) return { kind: 'error', text: `dev server not found: ${id}` }
      try {
        await supervisor.stop(item)
        registry.update(id, { status: 'stopped' })
        return { kind: 'success', text: `stopped ${id}` }
      } catch (error) {
        return { kind: 'error', text: `dev-stop failed: ${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })
  ctx.commands.register({
    name: 'dev-logs',
    description: 'Show recent output lines for a development server.',
    input: { hint: '<server-id>' },
    recordInput: false,
    async handler(invocation: any) {
      const id = String(invocation.rawInput ?? '').trim()
      try {
        return { kind: 'success', text: await supervisor.logs(registry.get(id)) }
      } catch (error) {
        return { kind: 'error', text: `dev-logs failed: ${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })
}