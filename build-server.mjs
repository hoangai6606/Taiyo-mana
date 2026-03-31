import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const entry = resolve(__dirname, 'server', 'index.ts');
const outDir = resolve(__dirname, 'dist', 'server');

const out = resolve(outDir, 'index.js');
// Ensure directory exists
const tmpDir = resolve(dirname(out));
if (!existsSync(tmpDir)) {
  execSync(`mkdir -p "${tmpDir}"`);
}
// Build with esbuild
console.log('Building server bundle...');
try {
  execSync(`npx esbuild "${entry}" --bundle --platform=node --outfile="${out}" --format=esm --packages=external`, { stdio: 'inherit' });
  console.log('Server bundle created:', out);
} catch (e) {
  console.error('esbuild build failed:', e.message);
  process.exit(1);
}
