import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');

const packCapture = workflow.match(/npm pack --json[^\n]*\|\s*node[^\n]*>>\s*"\$GITHUB_OUTPUT"/);
if (!packCapture) {
  throw new Error('Release workflow must capture the npm pack filename in a step output');
}

const outputNames = [...workflow.matchAll(/steps\.package\.outputs\.([A-Za-z0-9_-]+)/g)].map(
  (match) => match[1],
);
if (outputNames.length !== 2 || new Set(outputNames).size !== 1) {
  throw new Error('npm publish and GitHub release must consume the same package step output');
}

const artifact = `\${{ steps.package.outputs.${outputNames[0]} }}`;
if (!workflow.includes(`npm publish "${artifact}" --provenance --access public`)) {
  throw new Error('Release workflow must publish the captured tarball with provenance and public access');
}
if (!workflow.includes(`--notes-file RELEASE_NOTES.md "${artifact}"`)) {
  throw new Error('GitHub release must attach the same captured tarball');
}
if (/gh release create[^\n]*\*\.tgz/.test(workflow)) {
  throw new Error('GitHub release must not attach an ambiguous tarball glob');
}

console.log(`Verified release artifact contract through steps.package.outputs.${outputNames[0]}`);
