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

  const compiledTests = [...packedPaths].filter((path) =>
    /\.test\.(?:js|d\.ts)(?:\.map)?$/.test(path),
  );
  if (compiledTests.length > 0) {
    throw new Error(`Packed tarball contains compiled tests: ${compiledTests.join(', ')}`);
  }

  const tarball = join(temporaryDirectory, filename);
  const consumer = join(temporaryDirectory, 'consumer');
  await exec('mkdir', ['-p', consumer]);
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await exec('npm', ['install', '--ignore-scripts', tarball], { cwd: consumer });

  await writeFile(
    join(consumer, 'usage.ts'),
    `import { BenchmarkRunner, MockProvider, type BenchmarkFixture } from 'modbench';

const provider = new MockProvider({
  name: 'mock',
  providerType: 'mock',
  model: 'mock-gpt',
  apiKey: '',
  profile: 'fast',
});
const runner = new BenchmarkRunner(provider);
const fixture: BenchmarkFixture = {
  name: 'hello',
  description: 'A minimal library API benchmark',
  prompt: 'Say hello in one sentence.',
};
const results = await runner.run(fixture, { runs: 1 });
if (results.length !== 1 || results[0].provider !== 'mock') {
  throw new Error('Unexpected benchmark result');
}
`,
  );
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        outDir: 'dist',
      },
      include: ['usage.ts'],
    }),
  );
  await exec(join(process.cwd(), 'node_modules', '.bin', 'tsc'), ['--project', 'tsconfig.json'], {
    cwd: consumer,
  });
  await exec(process.execPath, ['dist/usage.js'], { cwd: consumer });

  const installedPackage = join(consumer, 'node_modules', 'modbench');
  const manifest = JSON.parse(await readFile(join(installedPackage, 'package.json'), 'utf8'));
  await access(join(installedPackage, manifest.types));
  const { stdout: version } = await exec(
    join(consumer, 'node_modules', '.bin', 'modbench'),
    ['--version'],
    { cwd: consumer },
  );
  if (version.trim() !== manifest.version) {
    throw new Error(`CLI returned ${version.trim()}, expected ${manifest.version}`);
  }

  console.log(`Verified ${filename}: compiled Library API usage, runtime, declarations, CLI, and package boundary`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
