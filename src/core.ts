export interface DevServerRecord {
  id: string;
  command: string;
  pid: number | null;
  status: string;
  startedAt: string;
}
export interface RegisterDevServerInput {
  id: string;
  command: string;
  pid?: number | null;
  status?: string;
}
export type DevServerPatch = Partial<Pick<DevServerRecord, 'pid' | 'status'>>;

export class DevServerRegistry {
  private readonly items = new Map<string, DevServerRecord>();

  register({ id, command, pid = null, status = 'running' }: RegisterDevServerInput): DevServerRecord {
    if (this.items.has(id)) throw new Error('duplicate server id');
    const value: DevServerRecord = { id: String(id), command: String(command), pid, status, startedAt: new Date().toISOString() };
    this.items.set(value.id, value);
    return { ...value };
  }

  update(id: string, patch: DevServerPatch): DevServerRecord {
    const value = this.items.get(id);
    if (!value) throw new Error('server not found');
    Object.assign(value, patch);
    return { ...value };
  }

  get(id: string): DevServerRecord | undefined {
    const value = this.items.get(id);
    return value ? { ...value } : undefined;
  }

  list(): DevServerRecord[] {
    return [...this.items.values()].map((item) => ({ ...item })).sort((a, b) => a.id.localeCompare(b.id));
  }
}

export function validateDevCommand(command: string): string {
  const value = String(command).trim();
  if (!value) throw new Error('empty command');
  if (/[;&|`\n]/.test(value)) throw new Error('compound shell syntax blocked');
  return value;
}
