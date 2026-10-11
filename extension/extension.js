/*
 * sdev VS Code extension — main entry point
 * --------------------------------------------------------------
 * Plain CommonJS, zero dependencies, zero build step.
 * Provides three commands:
 *   sdev.run            — run the active .sdev file
 *   sdev.runSelection   — run only the selected text
 *   sdev.openPlayground — open the online playground
 *
 * The "bundled" runner spawns Node.js against ./interpreter/sdev-cli.mjs —
 * the very same sdev CLI (built from the same language code as the web IDE:
 * dialects, extensions, the code understander, sdev:ai, v1 and v2), so a
 * file behaves identically in VS Code, the terminal and the website.
 *
 * Updates: once a day the extension reads <site>/releases.json and, when a
 * newer version exists, downloads and installs it (setting sdev.autoUpdate).
 */
const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let outputChannel;
const SITE = 'https://web.sdev.codes';

/** The CLI finds its seed VM and native runtime next to itself; never nag about updates from inside VS Code. */
function cliEnv(ext) {
  return { ...process.env, SDEV_NO_UPDATE_CHECK: '1', SDEV_RUNTIME_S: path.join(ext, 'interpreter', 'runtime.s') };
}

function getOutput() {
  if (!outputChannel) outputChannel = vscode.window.createOutputChannel('sdev');
  return outputChannel;
}

function getConfig() {
  return vscode.workspace.getConfiguration('sdev');
}

/**
 * Build the [command, args, env] tuple for the current runner setting.
 * Returns null on misconfiguration (with a user-facing error already shown).
 */
function buildRunner(context, sourceFile) {
  const cfg = getConfig();
  const runner = cfg.get('runner', 'bundled');
  const ext = context.extensionPath;

  if (runner === 'python') {
    const py = cfg.get('pythonPath', 'python3');
    const interpreter = path.join(ext, 'interpreter', 'sdev-interpreter.py');
    if (!fs.existsSync(interpreter)) {
      vscode.window.showErrorMessage(`Bundled Python interpreter missing: ${interpreter}`);
      return null;
    }
    return { cmd: py, args: [interpreter, sourceFile] };
  }

  // bundled & node run the bundled sdev CLI — identical to the website.
  const node = cfg.get('nodePath', 'node');
  const cli = path.join(ext, 'interpreter', 'sdev-cli.mjs');
  if (fs.existsSync(cli)) return { cmd: node, args: [cli, 'run', sourceFile], env: cliEnv(ext) };
  const interpreter = path.join(ext, 'interpreter', 'sdev-interpreter.js');
  if (!fs.existsSync(interpreter)) {
    vscode.window.showErrorMessage('Bundled sdev interpreter is missing from the extension package.');
    return null;
  }
  return { cmd: node, args: [interpreter, sourceFile] };
}

async function runSource(context, source, label) {
  const out = getOutput();
  out.show(true);
  out.appendLine(`──── sdev: ${label} ────`);

  // Write source to a temp file the runner can ingest.
  const tmpFile = path.join(os.tmpdir(), `sdev-${Date.now()}-${process.pid}.sdev`);
  fs.writeFileSync(tmpFile, source, 'utf8');

  const runner = buildRunner(context, tmpFile);
  if (!runner) return;

  const start = Date.now();
  const child = spawn(runner.cmd, runner.args, { shell: false, env: runner.env || process.env });

  child.stdout.on('data', (chunk) => out.append(chunk.toString()));
  child.stderr.on('data', (chunk) => out.append(chunk.toString()));
  child.on('error', (err) => {
    out.appendLine(`\n✗ Failed to start runner '${runner.cmd}': ${err.message}`);
    out.appendLine(`  Configure 'sdev.nodePath' or 'sdev.pythonPath' in Settings.`);
    cleanup();
  });
  child.on('close', (code) => {
    const ms = Date.now() - start;
    out.appendLine(`\n${code === 0 ? '✓' : '✗'} Exit ${code} · ${ms}ms`);
    cleanup();
  });

  function cleanup() {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

/** Run a file through the bundled v2 toolchain (self-hosted compiler + seed VM). */
async function runV2(context, file) {
  const out = getOutput();
  out.show(true);
  out.appendLine(`──── sdev v2: ${path.basename(file)} ────`);
  const node = getConfig().get('nodePath', 'node');
  const ext = context.extensionPath;
  const full = path.join(ext, 'interpreter', 'sdev-cli.mjs');
  const legacy = path.join(ext, 'interpreter', 'sdev-v2.cjs');
  const args = fs.existsSync(full) ? [full, 'run', file, '--runtime', 'v2'] : [legacy, file];
  if (!fs.existsSync(args[0])) {
    vscode.window.showErrorMessage('Bundled v2 runtime is missing from the extension package.');
    return;
  }
  const start = Date.now();
  const child = spawn(node, args, { shell: false, env: cliEnv(ext) });
  child.stdout.on('data', (c) => out.append(c.toString()));
  child.stderr.on('data', (c) => out.append(c.toString()));
  child.on('error', (err) => out.appendLine(`\n✗ Failed to start '${node}': ${err.message}`));
  child.on('close', (code) => out.appendLine(`\n${code === 0 ? '✓' : '✗'} Exit ${code} · ${Date.now() - start}ms`));
}

/** Compile a file to a native x86-64 executable with the bundled backend. */
async function buildNative(context, file) {
  const cfg = getConfig();
  const out = getOutput();
  out.show(true);
  out.appendLine(`──── sdev native: ${path.basename(file)} ────`);
  const node = cfg.get('nodePath', 'node');
  const full = path.join(context.extensionPath, 'interpreter', 'sdev-cli.mjs');
  const cli = fs.existsSync(full) ? full : path.join(context.extensionPath, 'interpreter', 'sdev-native.cjs');
  if (!fs.existsSync(cli)) {
    vscode.window.showErrorMessage('Bundled native backend is missing from the extension package.');
    return;
  }
  const outDir = cfg.get('native.outputDir', '') || path.dirname(file);
  const target = path.join(outDir, path.basename(file).replace(/\.(sdev|sdv)$/, ''));
  const args = [cli, ...(cli === full ? ['native'] : []), file, '-o', target, '--as', cfg.get('native.assembler', 'as'), '--ld', cfg.get('native.linker', 'ld')];
  const env = { ...process.env, SDEV_RUNTIME_S: path.join(context.extensionPath, 'interpreter', 'runtime.s') };
  const child = spawn(node, args, { shell: false, env });
  child.stdout.on('data', (c) => out.append(c.toString()));
  child.stderr.on('data', (c) => out.append(c.toString()));
  child.on('error', (err) => out.appendLine(`\n✗ ${err.message}`));
  child.on('close', (code) => {
    out.appendLine(`\n${code === 0 ? `✓ built ${target}` : `✗ Exit ${code}`}`);
    if (code === 0) vscode.window.showInformationMessage(`sdev: built native executable ${target}`);
  });
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('sdev.run', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'sdev') {
        vscode.window.showWarningMessage('Open an .sdev file to run it.');
        return;
      }
      // Save first so the on-disk file matches what we run.
      if (editor.document.isDirty) await editor.document.save();
      if (getConfig().get('dialect', 'v1') === 'v2') {
        await runV2(context, editor.document.fileName);
        return;
      }
      await runSource(context, editor.document.getText(), `Run ${path.basename(editor.document.fileName)}`);
    }),

    vscode.commands.registerCommand('sdev.runV2', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'sdev') {
        vscode.window.showWarningMessage('Open an .sdev file to run it.');
        return;
      }
      if (editor.document.isDirty) await editor.document.save();
      await runV2(context, editor.document.fileName);
    }),

    vscode.commands.registerCommand('sdev.buildNative', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'sdev') {
        vscode.window.showWarningMessage('Open an .sdev file to build it.');
        return;
      }
      if (editor.document.isDirty) await editor.document.save();
      await buildNative(context, editor.document.fileName);
    }),

    vscode.commands.registerCommand('sdev.runSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const sel = editor.document.getText(editor.selection);
      if (!sel.trim()) {
        vscode.window.showInformationMessage('Nothing selected.');
        return;
      }
      await runSource(context, sel, 'Run Selection');
    }),

    vscode.commands.registerCommand('sdev.openPlayground', () => {
      vscode.env.openExternal(vscode.Uri.parse(SITE));
    }),

    vscode.commands.registerCommand('sdev.openDocs', () => {
      vscode.env.openExternal(vscode.Uri.parse(SITE + '/docs'));
    }),
  );

  context.subscriptions.push(vscode.commands.registerCommand('sdev.checkForUpdates', () => checkForUpdate(context, true)));
  scheduleUpdates(context);

  // Friendly first-run message.
  const seenKey = 'sdev.welcomeShown.v1';
  if (!context.globalState.get(seenKey)) {
    context.globalState.update(seenKey, true);
    vscode.window.showInformationMessage(
      'sdev language support installed. Press Ctrl+Enter (Cmd+Enter on macOS) in any .sdev file to run it.',
      'Open Playground'
    ).then((choice) => {
      if (choice === 'Open Playground') {
        vscode.commands.executeCommand('sdev.openPlayground');
      }
    });
  }
}

// ---- automatic updates ---------------------------------------------------
function newer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

async function checkForUpdate(context, manual) {
  const current = context.extension ? context.extension.packageJSON.version : require('./package.json').version;
  try {
    const res = await fetch(SITE + '/releases.json', { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rel = await res.json();
    if (!newer(rel.version, current)) {
      if (manual) vscode.window.showInformationMessage(`sdev ${current} is the newest version.`);
      return;
    }
    const install = async () => {
      const bin = await fetch(rel.vscode.url);
      if (!bin.ok) throw new Error('download failed (' + bin.status + ')');
      const file = path.join(os.tmpdir(), `sdev-language-${rel.version}.vsix`);
      fs.writeFileSync(file, Buffer.from(await bin.arrayBuffer()));
      await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(file));
      const choice = await vscode.window.showInformationMessage(`sdev updated to ${rel.version}. Reload to use it.`, 'Reload now');
      if (choice === 'Reload now') vscode.commands.executeCommand('workbench.action.reloadWindow');
    };
    if (getConfig().get('autoUpdate', true) && !manual) return install();
    const choice = await vscode.window.showInformationMessage(`sdev ${rel.version} is available (you have ${current}).`, 'Update');
    if (choice === 'Update') await install();
  } catch (e) {
    if (manual) vscode.window.showWarningMessage('Could not check for sdev updates: ' + (e && e.message ? e.message : e));
  }
}

function scheduleUpdates(context) {
  const key = 'sdev.lastUpdateCheck';
  const last = context.globalState.get(key, 0);
  if (Date.now() - last > 24 * 3600 * 1000) {
    context.globalState.update(key, Date.now());
    setTimeout(() => checkForUpdate(context, false), 5000);
  }
}

function deactivate() {
  if (outputChannel) outputChannel.dispose();
}

module.exports = { activate, deactivate };
