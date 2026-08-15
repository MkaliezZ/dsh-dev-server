import { DevServerRegistry, validateDevCommand, type DevServerRecord } from './core.js';

interface CommandContext {
  command?: (name: string, handler: (...args: string[]) => unknown | Promise<unknown>) => unknown;
}
interface StartResult { pid?: number | null; }
interface DevServerSupervisor {
  start: (command: string) => Promise<StartResult | void> | StartResult | void;
  stop: (server: DevServerRecord) => Promise<void> | void;
  logs: (server: DevServerRecord | undefined) => Promise<unknown> | unknown;
}

export function registerDevServer(
  ctx: CommandContext,
  { start, stop, logs }: DevServerSupervisor,
  registry = new DevServerRegistry(),
): DevServerRegistry {
  ctx.command?.('dev-start', async (id, ...parts) => {
    const command = validateDevCommand(parts.join(' '));
    const handle = await start(command);
    registry.register({ id, command, pid: handle?.pid ?? null });
    return JSON.stringify(registry.get(id));
  });
  ctx.command?.('dev-list', async () => JSON.stringify(registry.list(), null, 2));
  ctx.command?.('dev-stop', async (id) => {
    const item = registry.get(id);
    if (!item) throw new Error('server not found');
    await stop(item);
    registry.update(id, { status: 'stopped' });
    return 'stopped';
  });
  ctx.command?.('dev-logs', async (id) => logs(registry.get(id)));
  return registry;
}
