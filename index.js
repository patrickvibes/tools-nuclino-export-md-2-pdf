#!/usr/bin/env node

/**
 * md-to-pdf
 * Converts a folder of Markdown files to PDF, with images embedded from
 * a `files/<uuid>/` subfolder structure (supports space-escaped paths).
 *
 * Requires: wkhtmltopdf  →  https://wkhtmltopdf.org/downloads.html
 * Run:      node index.js
 */

import { input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { marked } = require('marked');

// ─── Sanity check ─────────────────────────────────────────────────────────────

function checkDependencies() {
  try {
    execSync('wkhtmltopdf --version', { stdio: 'pipe' });
  } catch {
    console.error(chalk.red('\n  ✗ wkhtmltopdf not found.\n'));
    console.error(
      chalk.dim('  Install it from: https://wkhtmltopdf.org/downloads.html\n') +
      chalk.dim('  macOS:   brew install wkhtmltopdf\n') +
      chalk.dim('  Ubuntu:  sudo apt-get install wkhtmltopdf\n') +
      chalk.dim('  Windows: download installer from site above\n')
    );
    process.exit(1);
  }
}

// ─── Image embedding ──────────────────────────────────────────────────────────

const MIME = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  svg:  'image/svg+xml',
  bmp:  'image/bmp',
};

function imageToDataUri(src, baseDir) {
  const fullPath = path.resolve(baseDir, src);
  if (!fs.existsSync(fullPath)) return null;
  const ext  = path.extname(src).toLowerCase().slice(1);
  const mime = MIME[ext] || 'image/png';
  return `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
}

/**
 * Rewrites all local image references to embedded base64 data URIs.
 *
 * Handles both Markdown image syntax forms:
 *   ![alt](files/uuid/image.png)          standard (no spaces in path)
 *   ![alt](<files/uuid/image name.png>)   angle-bracket escaped (spaces OK)
 *
 * External http/https URLs are left untouched.
 */
function embedImages(mdContent, baseDir) {
  let missing = 0;

  // 1. Angle-bracket wrapped paths  ![alt](<path with spaces>)
  let out = mdContent.replace(
    /!\[([^\]]*)\]\(<([^>]+)>\)/g,
    (match, alt, src) => {
      const uri = imageToDataUri(src, baseDir);
      if (!uri) { missing++; return match; }
      return `![${alt}](${uri})`;
    }
  );

  // 2. Standard paths  ![alt](path/no/spaces.png)
  out = out.replace(
    /!\[([^\]]*)\]\((?!<)(?!data:)([^)<\s]+)\)/g,
    (match, alt, src) => {
      if (/^https?:\/\//.test(src)) return match; // keep external URLs
      const uri = imageToDataUri(src, baseDir);
      if (!uri) { missing++; return match; }
      return `![${alt}](${uri})`;
    }
  );

  return { out, missing };
}

// ─── HTML template ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function buildHtml(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #24292e;
      max-width: 860px;
      margin: 0 auto;
      padding: 48px 56px;
    }

    h1 { font-size: 2em;   border-bottom: 2px solid #e1e4e8; padding-bottom: 0.3em;  margin: 1.2em 0 0.6em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 0.25em; margin: 1.1em 0 0.5em; }
    h3 { font-size: 1.2em; margin: 1em 0 0.4em; }
    h4 { font-size: 1em;   margin: 0.9em 0 0.35em; }
    h5, h6 { font-size: 0.9em; margin: 0.8em 0 0.3em; color: #586069; }
    h1:first-child, h2:first-child { margin-top: 0; }

    p { margin: 0.6em 0 0.8em; }

    a { color: #0366d6; text-decoration: none; }

    ul, ol { margin: 0.5em 0 0.8em 1.6em; }
    li { margin: 0.25em 0; }
    li > ul, li > ol { margin-top: 0.2em; }

    code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.875em;
      background: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      border: 1px solid #e1e4e8;
    }
    pre {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin: 0.8em 0;
    }
    pre code { background: none; border: none; padding: 0; font-size: 0.85em; line-height: 1.5; }

    blockquote {
      border-left: 4px solid #dfe2e5;
      padding: 0 1em;
      color: #6a737d;
      margin: 0.8em 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      font-size: 0.9em;
    }
    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; font-weight: 600; }
    tr:nth-child(even) { background: #fafbfc; }

    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
      border-radius: 4px;
      border: 1px solid #e1e4e8;
    }

    hr { border: none; border-top: 2px solid #e1e4e8; margin: 1.5em 0; }

    strong { font-weight: 600; }
    em { font-style: italic; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ─── Convert one file ─────────────────────────────────────────────────────────

function convertFile(mdFilePath, outputDir) {
  const baseDir    = path.dirname(mdFilePath);
  const baseName   = path.basename(mdFilePath, path.extname(mdFilePath));
  const outputPath = path.join(outputDir, `${baseName}.pdf`);
  const tmpHtml    = path.join(outputDir, `.tmp_${Date.now()}_${baseName}.html`);

  const mdRaw               = fs.readFileSync(mdFilePath, 'utf8');
  const { out: mdEmbedded, missing } = embedImages(mdRaw, baseDir);
  const bodyHtml            = marked.parse(mdEmbedded);
  const fullHtml            = buildHtml(bodyHtml, baseName);

  fs.writeFileSync(tmpHtml, fullHtml, 'utf8');

  try {
    execFileSync('wkhtmltopdf', [
      '--quiet',
      '--page-size',     'A4',
      '--margin-top',    '15mm',
      '--margin-bottom', '15mm',
      '--margin-left',   '15mm',
      '--margin-right',  '15mm',
      tmpHtml,
      outputPath,
    ], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }

  return { outputPath, missing };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findMarkdownFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => /\.md$/i.test(f))
    .sort()
    .map(f => path.join(dir, f));
}

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(chalk.bold.cyan('  ╔══════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('       MD → PDF Converter         ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚══════════════════════════════════╝'));
  console.log('');

  checkDependencies();

  // ── 1. Source folder ──
  const sourceInput = await input({
    message: 'Source folder (containing .md files):',
    default: process.cwd(),
    validate(val) {
      const p = path.resolve(val.trim());
      if (!fs.existsSync(p))             return `Not found: ${p}`;
      if (!fs.statSync(p).isDirectory()) return 'That path is not a folder';
      return true;
    },
  });

  const sourceDir = path.resolve(sourceInput.trim());

  // ── 2. Discover files ──
  const mdFiles = findMarkdownFiles(sourceDir);

  if (mdFiles.length === 0) {
    console.log(chalk.red('\n  No .md files found in that folder.\n'));
    process.exit(1);
  }

  console.log('');
  console.log(chalk.dim(`  Found ${mdFiles.length} markdown file(s):`));
  mdFiles.forEach(f => console.log(chalk.dim(`    • ${path.basename(f)}`)));
  console.log('');

  // ── 3. Output folder ──
  const defaultOutput = path.join(sourceDir, 'pdf-output');
  const outputInput = await input({
    message: 'Output folder for PDFs:',
    default: defaultOutput,
  });

  const outputDir = path.resolve(outputInput.trim());

  // ── 4. Confirm ──
  console.log('');
  const go = await confirm({
    message: `Convert ${chalk.bold(mdFiles.length)} file(s) → ${chalk.cyan(outputDir)}?`,
    default: true,
  });

  if (!go) {
    console.log(chalk.dim('\n  Cancelled.\n'));
    process.exit(0);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // ── 5. Convert ──
  console.log('');
  let succeeded    = 0;
  let failed       = 0;
  let totalSize    = 0;
  let totalMissing = 0;

  for (const mdFile of mdFiles) {
    const name    = path.basename(mdFile);
    const spinner = ora({ text: chalk.white(name), color: 'cyan', indent: 2 }).start();

    try {
      const { outputPath, missing } = convertFile(mdFile, outputDir);
      const size = fs.statSync(outputPath).size;
      totalSize    += size;
      totalMissing += missing;

      const warn = missing > 0 ? chalk.yellow(`  ⚠ ${missing} image(s) not found`) : '';
      spinner.succeed(
        chalk.green(name) +
        chalk.dim(`  →  ${path.basename(outputPath)}  (${formatSize(size)})`) +
        warn
      );
      succeeded++;
    } catch (err) {
      spinner.fail(chalk.red(name) + chalk.dim(`  —  ${err.message}`));
      failed++;
    }
  }

  // ── 6. Summary ──
  console.log('');
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  if (succeeded > 0) {
    console.log(
      chalk.bold.green(`  ✓  ${succeeded} PDF(s) saved`) +
      chalk.dim(`  ·  ${formatSize(totalSize)} total`) +
      '\n' +
      chalk.dim(`     ${outputDir}`)
    );
  }
  if (totalMissing > 0) {
    console.log(chalk.yellow(`\n  ⚠  ${totalMissing} image reference(s) were not found and skipped`));
  }
  if (failed > 0) {
    console.log(chalk.bold.red(`\n  ✗  ${failed} file(s) failed to convert`));
  }
  console.log('');
}

main().catch(err => {
  console.error(chalk.red('\n  Fatal error:'), err.message);
  process.exit(1);
});
