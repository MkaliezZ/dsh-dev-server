import test from 'node:test';
import assert from 'node:assert/strict';
import { DevServerRegistry, validateDevCommand } from '../src/core.js';

test('tracks server lifecycle', () => {
  const registry = new DevServerRegistry();
  registry.register({ id: 'web', command: 'npm run dev', pid: 10 });
  registry.update('web', { status: 'stopped' });
  assert.equal(registry.get('web')?.status, 'stopped');
});
test('blocks compound shell syntax', () => assert.throws(() => validateDevCommand('npm run dev; rm -rf x')));
test('accepts simple command', () => assert.equal(validateDevCommand('npm run dev'), 'npm run dev'));
