import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(join(root, name), 'utf8');
const output = join(root, 'dist');
await mkdir(output, { recursive: true });

// Explicit order keeps the offline build independent of a module loader.
const workerFiles = [
  'vendor/jszip-3.10.1.min.js',
  'src/config.js',
  'src/logcat.js',
  'src/log-query.js',
  'src/bugreport-analysis.js',
  'src/packages-analysis.js',
  'src/analysis-worker.js',
];
const workerSources = await Promise.all(workerFiles.map(read));
const worker = workerSources.join('\n;\n');
// A script end tag in a JS string/comment can still terminate an HTML script.
if (/<\/script\b/i.test(worker)) throw new Error('Worker source contains an unsafe HTML script end tag.');
const template = await read('src/index.template.html');
const marker = '/* ANALYSIS_WORKER_BUNDLE */';
if (template.split(marker).length !== 2) throw new Error('Expected one worker marker in the HTML template.');
// A replacement callback preserves literal $ patterns in parser regexes.
const html = template.replace(marker, () => worker);
const app = `'use strict';\n${await read('src/config.js')}\n${await read('src/packages-analysis.js')}\n${await read('src/packages-view.js')}\n${await read('src/app.js')}`;
await writeFile(join(output, 'index.html'), html);
await writeFile(join(output, 'bugreport.js'), app);

const stylesheet = process.argv[2] ? resolve(process.argv[2]) : join(root, 'styles.css');
try {
  await copyFile(stylesheet, join(output, 'styles.css'));
  console.log('Built dist/index.html, dist/bugreport.js, and dist/styles.css.');
} catch (error) {
  if (error.code !== 'ENOENT' || process.argv[2]) throw error;
  console.log('Built dist/index.html and dist/bugreport.js. Add your existing styles.css to dist/.');
}
