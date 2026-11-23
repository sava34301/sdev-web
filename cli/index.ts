/**
 * sdev — the official command line for the sdev language.
 */
import './env';
import { SDEV_HOME } from './env';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { translateSource, detectLanguage, SUPPORTED_LANGUAGES } from '@/lang/tools/translator';
import { formatSdev } from '@/lang/tools/formatter';
import { readSignature, stripSignature, repairSignature } from '@/lang/dialect/signature';
import { die, emit, flag, help, positionals, runOptions, value } from './args';
import { cmdAgent } from './commands/agent';
import { cmdAuth, cmdCloud } from './commands/cloud';
import { cmdDialect, cmdExt, cmdInfo, cmdLib, cmdSign } from './commands/dialect';
import { cmdBuildWeb, cmdCompile, cmdDisasm, cmdEdit, cmdNative, cmdRepl, cmdRun, cmdRunBc, cmdWatch, parseFile } from './commands/run';
import { cmdApi, cmdDoctor, cmdExplain, cmdInit, cmdLint, cmdNew } from './commands/tools';
import { readSource } from './pipeline';
import { runtimePreference, setRuntimePreference } from './store';
import { maybeNotifyUpdate, runUpdate } from './update';
import { VERSION } from './version';

async function main(): Promise<void> {
  const pos = positionals();
  const cmd = pos[0];

  if (!cmd || flag('--help', '-h')) return help();
  if (flag('--version', '-v')) return console.log('sdev v' + VERSION);
  if (cmd !== 'update') void maybeNotifyUpdate();

  switch (cmd) {
    case 'update':
      return runUpdate(flag('--force'));
    case 'new':
      return cmdNew(pos[1]);
    case 'init':
      return cmdInit();
    case 'run':
    case 'exec':
      return cmdRun(pos[1]);
    case 'repl':
      return cmdRepl();
    case 'watch':
      return cmdWatch(pos[1] ?? die('sdev watch <file>'));
    case 'check': {
      parseFile(pos[1] ?? die('sdev check <file>'), runOptions());
      console.log('OK — no syntax errors');
      return;
    }
    case 'ast': {
      const { ast } = parseFile(pos[1] ?? die('sdev ast <file>'), runOptions());
      emit(JSON.stringify(ast, null, 2));
      return;
    }
    case 'fmt': {
      const file = pos[1] ?? die('sdev fmt <file>');
      const raw = readSource(file);
      const formatted = formatSdev(stripSignature(raw));
      if (flag('-w', '--write')) {
        const sig = readSignature(raw);
        writeFileSync(resolve(process.cwd(), file), sig ? repairSignature(raw.split('\n')[0] + '\n' + formatted) : formatted);
        console.log('formatted', basename(file));
      } else process.stdout.write(formatted.endsWith('\n') ? formatted : formatted + '\n');
      return;
    }
    case 'compile':
      return cmdCompile(pos[1] ?? die('sdev compile <file>'));
    case 'build-web':
    case 'web':
      return cmdBuildWeb(pos[1] ?? die('sdev build-web <file.sdev> [-o index.html]'));
    case 'run-bc':
      return cmdRunBc(pos[1] ?? die('sdev run-bc <file.sdevc>'));
    case 'disasm':
      return cmdDisasm(pos[1] ?? die('sdev disasm <file>'));
    case 'native':
      return cmdNative(pos[1] ?? die('sdev native <file>'));
    case 'info':
      return cmdInfo(pos[1] ?? die('sdev info <file>'));
    case 'sign':
      return cmdSign(pos[1] ?? 'show', pos[2] ?? die('sdev sign <show|stamp|verify|strip> <file>'));
    case 'agent':
      return cmdAgent(pos[1], pos.slice(2));
    case 'dialect':
      return cmdDialect(pos[1], pos.slice(2));
    case 'ext':
      return cmdExt(pos[1], pos.slice(2));
    case 'lib':
      return cmdLib(pos[1], pos.slice(2));
    case 'edit':
    case 'ide':
      return cmdEdit(pos[1]);
    case 'auth':
    case 'login':
      return cmdAuth(cmd === 'login' ? 'login' : (pos[1] ?? 'whoami'), cmd === 'login' ? pos.slice(1) : pos.slice(2));
    case 'logout':
      return cmdAuth('logout', []);
    case 'whoami':
      return cmdAuth('whoami', []);
    case 'cloud':
      return cmdCloud(pos[1], pos.slice(2));
    case 'runtime': {
      const rt = pos[1];
      if (rt === 'v1' || rt === 'v2') { setRuntimePreference(rt); console.log('default runtime:', rt); }
      else console.log('default runtime:', runtimePreference());
      return;
    }
    case 'languages':
      for (const l of SUPPORTED_LANGUAGES) console.log(' -', l);
      return;
    case 'translate': {
      const file = pos[1] ?? die('sdev translate <file> --to <Language>');
      const to = value('--to') ?? die('--to <Language> is required');
      const src = stripSignature(readSource(file));
      const from = value('--from') ?? detectLanguage(src) ?? 'English';
      emit(translateSource(src, from, to).translated);
      return;
    }
    case 'home':
      console.log(SDEV_HOME);
      return;
    case 'doctor':
      return cmdDoctor();
    case 'explain':
      return cmdExplain(pos[1] ?? die('sdev explain <CODE|name>'));
    case 'lint':
      return cmdLint(pos[1] ?? die('sdev lint <file.sdev>'));
    case 'api':
      return cmdApi(pos[1]);
    case 'version':
      console.log('sdev v' + VERSION);
      return;
    case 'help':
      return help();
    default: {
      if (existsSync(resolve(process.cwd(), cmd))) return cmdRun(cmd);
      console.error(`unknown command "${cmd}"`);
      help();
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error('error:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
