import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'modbench-package-smoke-'));

try {
  const { stdout } = await exec('npm', [
    'pack',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    temporaryDirectory,
  ]);
  const [{ filename, files }] = JSON.parse(stdout);
  const packedPaths = new Set(files.map((file) => file.path));

  for (const path of ['dist/cli.js', 'dist/index.js', 'dist/index.d.ts']) {
    if (!packedPaths.has(path)) {
      throw new Error(`Packed tarball is missing ${path}`);
    }
  }

  const tarball = join(temporaryDirectory, filename);
  const consumer = join(temporaryDirectory, 'consumer');
  await exec('mkdir', ['-p', consumer]);
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await exec('npm', ['install', '--ignore-scripts', tarball], { cwd: consumer });

  const installedPackage = join(consumer, 'node_modules', 'modbench');
  const manifest = JSON.parse(await readFile(join(installedPackage, 'package.json'), 'utf8'));
  await access(join(installedPackage, manifest.types));
  await exec(
    process.execPath,
    ['--input-type=module', '--eval', "import { BenchmarkRunner } from 'modbench'; if (!BenchmarkRunner) process.exit(1)"],
    { cwd: consumer },
  );
  const { stdout: version } = await exec(
    join(consumer, 'node_modules', '.bin', 'modbench'),
    ['--version'],
    { cwd: consumer },
  );
  if (version.trim() !== manifest.version) {
    throw new Error(`CLI returned ${version.trim()}, expected ${manifest.version}`);
  }

  console.log(`Verified ${filename}: JS export, CLI, and type declaration`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
