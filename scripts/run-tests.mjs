import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...await findTests(path));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      tests.push(path);
    }
  }

  return tests;
}

const tests = (await findTests('dist')).sort();
if (tests.length === 0) {
  throw new Error('No compiled test files found in dist');
}

console.log(`Running ${tests.length} compiled test files`);
const child = spawn(
  process.execPath,
  ['--experimental-vm-modules', '--test', ...tests],
  { stdio: 'inherit' },
);
child.on('error', (error) => {
  throw error;
});
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});
