import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import {
  readSignature, writeSignature, stripSignature, hasSignature,
  isSignatureStale, repairSignature, checksum,
} from '@/lang/dialect/signature';
import { validateDialect, isPublishable, inherit, preludeSource, type DialectSpec } from '@/lang/dialect/spec';
import { serializeDialectToSdev, serializeDialectCollectionToSdev, parseDialectCollection } from '@/lang/dialect/sdev-format';
import { canonicalize, dialectize, translateDialect } from '@/lang/dialect/canonicalize';
import { presetList, findPreset } from '@/lang/dialect/presets';
import { generateDialectDocs, TEMPLATE_VERSION } from '@/lang/dialect/docs';
import { parseReference, parseAddress, formatAddress } from '@/lang/dialect/address';
import { CATALOG, GROUP_LABELS } from '@/lang/dialect/catalog';
import {
  cachedLibraries, cacheBundle, forgetBundle, fetchLibrary,
  exportOfflineBundle, importOfflineBundle, libraryReferences,
} from '@/lang/dialect/registry';
import {
  cachedExtensions, enabledIds, setExtensionEnabled, syncExtensions,
  installExtension, activeExtensions, extensionPrelude, type ExtensionRecord,
} from '@/lang/dialect/extensions';
import { die, emit, flag, value } from '../args';
import { currentUser, db, myUsername, requireUser } from '../cloud';
import { readSource } from '../pipeline';
import {
  listDialects, saveDialect, removeDialect, findDialect, newDialect,
  activeSlug, setActiveSlug, activeDialect, runtimePreference,
} from '../store';

export function cmdInfo(file: string): void {
  const raw = readSource(file);
  const sig = readSignature(raw);
  const body = stripSignature(raw);
  const dialect = sig?.dialect ? findDialect(sig.dialect.replace(/^@[^/]+\//, '')) : null;
  const rows: [string, string][] = [
    ['file', resolve(process.cwd(), file)],
    ['size', `${Buffer.byteLength(body)} bytes · ${body.split('\n').length} lines`],
    ['signed', hasSignature(raw) ? 'yes' : 'no'],
    ['runtime', sig?.rt ?? `${runtimePreference()} (default)`],
    ['dialect', sig?.dialect ? `${sig.dialect}${sig.dialectVersion ? ' v' + sig.dialectVersion : ''}${dialect ? '' : ' (not installed)'}` : 'canonical sdev'],
    ['origin', sig?.origin ?? '—'],
    ['checksum', sig?.sum ? `${sig.sum} · ${isSignatureStale(raw) ? 'STALE' : 'valid'}` : checksum(body) + ' (unrecorded)'],
    ['stamped', sig?.ts ? new Date(sig.ts).toLocaleString() : '—'],
    ['library pins', (sig?.libs?.length ? sig.libs : libraryReferences(body).map(formatAddress)).join(', ') || '—'],
    ['extensions', activeExtensions().map((e) => e.name).join(', ') || '—'],
  ];
  const width = Math.max(...rows.map((r) => r[0].length));
  for (const [k, v] of rows) console.log(k.padEnd(width) + '  ' + v);
}

export function cmdSign(sub: string, file: string): void {
  const path = resolve(process.cwd(), file);
  const raw = readSource(file);
  if (sub === 'show') {
    const sig = readSignature(raw);
    console.log(sig ? JSON.stringify(sig, null, 2) : 'no signature');
    return;
  }
  if (sub === 'strip') { writeFileSync(path, stripSignature(raw)); console.log('signature removed'); return; }
  if (sub === 'verify') {
    if (!hasSignature(raw)) return console.log('no signature');
    console.log(isSignatureStale(raw) ? 'STALE — body changed since it was stamped' : 'valid');
    return;
  }
  if (sub === 'stamp') {
    const body = stripSignature(raw);
    const dialect = activeDialect();
    const previous = readSignature(raw);
    const signed = hasSignature(raw) && !value('--dialect') && !flag('--force')
      ? repairSignature(raw)
      : writeSignature(raw, {
          rt: value('--runtime') ?? previous?.rt ?? runtimePreference(),
          dialect: value('--dialect') ?? dialect?.meta.slug ?? previous?.dialect ?? null,
          dialectVersion: dialect?.meta.version ?? previous?.dialectVersion ?? null,
          libs: libraryReferences(body).map(formatAddress),
          origin: previous?.origin ?? null,
        });
    writeFileSync(path, signed);
    console.log('stamped', basename(path));
    return;
  }
  die('sign: use show | stamp | verify | strip');
}

function requireLocalDialect(slug: string): DialectSpec {
  const spec = findDialect(slug);
  if (!spec) die(`no local dialect "${slug}"`);
  return spec;
}

async function installDialect(reference: string): Promise<DialectSpec> {
  const parsed = parseReference(reference);
  if (!parsed) die('use @username/dialect or an 8-character share code');
  let row: { spec: DialectSpec } | null = null;
  if (parsed.kind === 'code') {
    const { data } = await db.from('dialects').select('spec').eq('share_code', parsed.code).maybeSingle();
    row = data;
  } else {
    const { data: owner } = await db.from('usernames').select('user_id').eq('username', parsed.address.username).maybeSingle();
    if (!owner) die(`no user named @${parsed.address.username}`);
    const { data } = await db.from('dialects').select('spec').eq('user_id', owner.user_id).eq('slug', parsed.address.slug).maybeSingle();
    row = data;
  }
  if (!row?.spec) die('that dialect is not available');
  saveDialect(row.spec);
  return row.spec;
}

export async function cmdDialect(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = listDialects();
      if (!all.length) return console.log('no dialects yet — sdev dialect new <slug> --name "Name"');
      for (const d of all) {
        const mark = d.meta.slug === activeSlug() ? '*' : ' ';
        console.log(`${mark} ${d.meta.slug.padEnd(20)} ${d.meta.name}  v${d.meta.version}  ${d.meta.visibility}`);
      }
      return;
    }
    case 'new': {
      const slug = rest[0] ?? die('sdev dialect new <slug> --name "Name"');
      const spec = newDialect(value('--name') ?? slug, slug);
      console.log(`created ${spec.meta.slug} — edit words with: sdev dialect set ${slug} <canonical> <yourword>`);
      return;
    }
    case 'set': {
      const [slug, canonical, word] = rest;
      if (!slug || !canonical || !word) die('sdev dialect set <slug> <canonical-word> <your-word>');
      const spec = requireLocalDialect(slug);
      spec.names[canonical] = word;
      saveDialect(spec);
      console.log(`${canonical} -> ${word}`);
      return;
    }
    case 'use': {
      const slug = rest[0] ?? die('sdev dialect use <slug|none>');
      if (slug === 'none') { setActiveSlug(null); return console.log('using canonical sdev'); }
      requireLocalDialect(slug);
      setActiveSlug(slug);
      console.log('active dialect:', slug);
      return;
    }
    case 'show': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect show <slug>'));
      console.log(`${spec.meta.name} (${spec.meta.slug}) v${spec.meta.version} · ${spec.meta.visibility}`);
      console.log(`languages: ${spec.meta.languages.join(', ')}`);
      console.log(`style: blocks ${spec.style.blockStyle}, assignment ${spec.style.assignment}, comments "${spec.style.commentMarker}"`);
      const words = Object.entries(spec.names);
      console.log(words.length ? '\nwords:' : '\nno renamed words yet');
      for (const [k, v] of words) console.log(`  ${k.padEnd(16)} ${v}`);
      if (spec.constructs.functions.length) {
        console.log('\nadded functions:');
        for (const f of spec.constructs.functions) console.log(`  ${f.name}`);
      }
      if (spec.constructs.operators.length) {
        console.log('\noperators:');
        for (const o of spec.constructs.operators) console.log(`  ${o.symbol} -> ${o.call}`);
      }
      return;
    }
    case 'validate': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect validate <slug>'));
      const issues = validateDialect(spec);
      if (!issues.length) console.log('valid — ready to publish');
      for (const i of issues) console.log(`${i.level === 'error' ? 'error' : 'warn '}  ${i.message}`);
      if (!isPublishable(spec)) process.exitCode = 1;
      return;
    }
    case 'docs': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect docs <slug>'));
      const text = generateDialectDocs(spec);
      const out = value('-o', '--out');
      if (out) { writeFileSync(out, text); console.log('wrote', out, `(template v${TEMPLATE_VERSION})`); }
      else console.log(text);
      return;
    }
    case 'words': {
      let group = '';
      for (const entry of CATALOG) {
        if (entry.group !== group) { group = entry.group; console.log(`\n${GROUP_LABELS[entry.group]}`); }
        console.log(`  ${entry.word.padEnd(16)} ${entry.about ?? ''}`);
      }
      return;
    }
    case 'canon': {
      const file = rest[0] ?? die('sdev dialect canon <file> [--from slug]');
      const raw = stripSignature(readSource(file));
      const from = value('--from') ? requireLocalDialect(value('--from')!) : activeDialect();
      if (!from) die('no dialect selected — pass --from <slug>');
      emit(canonicalize(raw, from, { withPrelude: flag('--prelude') }).source);
      return;
    }
    case 'surface': {
      const file = rest[0] ?? die('sdev dialect surface <file> --to <slug>');
      const to = requireLocalDialect(value('--to') ?? die('--to <slug> is required'));
      emit(dialectize(stripSignature(readSource(file)), to));
      return;
    }
    case 'xlate': {
      const file = rest[0] ?? die('sdev dialect xlate <file> --from a --to b');
      const from = requireLocalDialect(value('--from') ?? die('--from <slug> is required'));
      const to = requireLocalDialect(value('--to') ?? die('--to <slug> is required'));
      emit(translateDialect(stripSignature(readSource(file)), from, to));
      return;
    }
    case 'prelude': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect prelude <slug>'));
      console.log(preludeSource(spec) || '(empty)');
      return;
    }
    case 'extend': {
      const [childSlug, baseSlug] = rest;
      if (!childSlug || !baseSlug) die('sdev dialect extend <slug> <base-slug>');
      const merged = inherit(requireLocalDialect(baseSlug), requireLocalDialect(childSlug));
      saveDialect(merged);
      console.log(`${childSlug} now extends ${baseSlug}`);
      return;
    }
    case 'install': {
      const ref = rest[0] ?? die('sdev dialect install <@user/slug|share-code>');
      const spec = await installDialect(ref);
      console.log(`installed ${spec.meta.slug} — ${spec.meta.name} v${spec.meta.version}`);
      return;
    }
    case 'publish': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect publish <slug>'));
      if (!isPublishable(spec)) die('fix the validation errors first: sdev dialect validate ' + spec.meta.slug);
      const user = await requireUser();
      const published: DialectSpec = { ...spec, meta: { ...spec.meta, visibility: spec.meta.visibility === 'private' ? 'public' : spec.meta.visibility } };
      await db.from('dialects').upsert({
        user_id: user.id, slug: published.meta.slug, name: published.meta.name,
        description: published.meta.description ?? '', languages: published.meta.languages,
        visibility: published.meta.visibility, extends_slug: published.meta.extends,
        latest_version: published.meta.version, spec: published, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slug' });
      const { data } = await db.from('dialects').select('id').eq('user_id', user.id).eq('slug', published.meta.slug).maybeSingle();
      if (data?.id) await db.from('dialect_versions').insert({ dialect_id: data.id, version: published.meta.version, spec: published });
      saveDialect(published);
      const handle = await myUsername(user.id);
      console.log(`published ${handle ? '@' + handle + '/' : ''}${published.meta.slug} v${published.meta.version}`);
      return;
    }
    case 'source': {
      const spec = requireLocalDialect(rest[0] ?? die('sdev dialect source <slug>'));
      emit(serializeDialectToSdev(spec));
      return;
    }
    case 'export': {
      const targetSlug = rest[0] && !rest[0].includes('.') ? rest[0] : null;
      const specs = targetSlug ? [requireLocalDialect(targetSlug)] : listDialects();
      const defaultOut = targetSlug ? `${targetSlug}.dialect.sdev` : 'sdev-dialects.sdev';
      const out = value('-o', '--out') ?? (!targetSlug && rest[0] ? rest[0] : defaultOut);
      writeFileSync(out, serializeDialectCollectionToSdev(specs));
      console.log('wrote', out);
      return;
    }
    case 'import': {
      const file = rest[0] ?? die('sdev dialect import <file.sdev>');
      const specs = parseDialectCollection(readSource(file));
      for (const s of specs) saveDialect(s);
      console.log(`imported ${specs.length} dialect(s)`);
      return;
    }
    case 'preset': {
      const slug = rest[0];
      if (!slug) {
        for (const p of presetList()) console.log(`${p.spec.meta.slug.padEnd(14)} ${p.spec.meta.name}  ${p.spec.meta.description ?? ''}`);
        return;
      }
      const preset = findPreset(slug) ?? die(`no ready-made dialect "${slug}"`);
      saveDialect(structuredClone(preset.spec));
      setActiveSlug(preset.spec.meta.slug);
      const out = value('-o', '--out');
      if (out) { writeFileSync(out, preset.sample + '\n'); console.log('wrote sample to', out); }
      console.log(`installed and using ${preset.spec.meta.name}`);
      return;
    }
    case 'pull': {
      const user = await requireUser();
      const { data } = await db.from('dialects').select('slug, spec').eq('user_id', user.id);
      const rows = (data ?? []).filter((r: { spec: DialectSpec }) => r.spec?.meta?.slug);
      for (const r of rows) saveDialect(r.spec);
      console.log(`pulled ${rows.length} dialect(s) from your account`);
      return;
    }
    case 'sync': {
      const user = await requireUser();
      const local = listDialects();
      for (const spec of local) {
        await db.from('dialects').upsert({
          user_id: user.id, slug: spec.meta.slug, name: spec.meta.name,
          description: spec.meta.description ?? '', languages: spec.meta.languages,
          visibility: spec.meta.visibility, extends_slug: spec.meta.extends,
          latest_version: spec.meta.version, spec, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,slug' });
      }
      const { data } = await db.from('dialects').select('slug, spec').eq('user_id', user.id);
      for (const r of data ?? []) if (r.spec?.meta?.slug) saveDialect(r.spec);
      console.log(`synced ${local.length} up, ${(data ?? []).length} down`);
      return;
    }
    case 'remove': {
      const slug = rest[0] ?? die('sdev dialect remove <slug>');
      console.log(removeDialect(slug) ? 'removed ' + slug : 'no such dialect');
      return;
    }
    default:
      die(`unknown dialect command "${sub}"`);
  }
}

export async function cmdExt(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = cachedExtensions();
      const on = new Set(enabledIds());
      if (!all.length) return console.log('no extensions cached — sdev ext sync (signed in) or sdev ext add <file>');
      for (const e of all) console.log(`${on.has(e.id) ? '[on ]' : '[off]'} ${e.id.slice(0, 8)}  ${e.name.padEnd(20)} ${e.kind}${e.symbol ? ' ' + e.symbol : ''}`);
      return;
    }
    case 'enable':
    case 'disable': {
      const id = rest[0] ?? die(`sdev ext ${sub} <id>`);
      const match = cachedExtensions().find((e) => e.id === id || e.id.startsWith(id) || e.name === id);
      if (!match) die('no such extension');
      setExtensionEnabled(match.id, sub === 'enable');
      console.log(`${match.name} ${sub}d`);
      return;
    }
    case 'add': {
      const file = rest[0] ?? die('sdev ext add <file.sdev> --name <name> [--about text]');
      const record: ExtensionRecord = {
        id: 'local-' + checksum(file + Date.now()),
        name: value('--name') ?? basename(file).replace(/\.sdev$/, ''),
        kind: value('--symbol') ? 'operator' : 'function',
        symbol: value('--symbol') ?? null,
        about: value('--about') ?? null,
        source: stripSignature(readSource(file)),
        visibility: 'private',
      };
      installExtension(record);
      setExtensionEnabled(record.id, true);
      console.log(`added and enabled ${record.name}`);
      return;
    }
    case 'pull':
    case 'sync': {
      const user = await currentUser();
      const all = await syncExtensions(user?.id ?? null);
      console.log(`synced ${all.length} extension(s)`);
      return;
    }
    case 'publish': {
      const key = rest[0] ?? die('sdev ext publish <id|name> [--as public|unlisted|private]');
      const match = cachedExtensions().find((e) => e.id === key || e.id.startsWith(key) || e.name === key);
      if (!match) die('no such extension');
      const user = await requireUser();
      const asked = value('--as');
      const visibility = asked === 'private' || asked === 'unlisted' || asked === 'public' ? asked : 'public';
      const { error } = await db.from('sdev_extensions').upsert({
        user_id: user.id, name: match.name, kind: match.kind, symbol: match.symbol,
        about: match.about, source: match.source, visibility, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,name' });
      if (error) die(error.message);
      await syncExtensions(user.id);
      console.log(`published ${match.name} (${visibility})`);
      return;
    }
    case 'rm':
    case 'remove': {
      const key = rest[0] ?? die('sdev ext remove <id|name>');
      const match = cachedExtensions().find((e) => e.id === key || e.id.startsWith(key) || e.name === key);
      if (!match) die('no such extension');
      const user = await currentUser();
      if (user && !match.id.startsWith('local-')) await db.from('sdev_extensions').delete().eq('user_id', user.id).eq('id', match.id);
      setExtensionEnabled(match.id, false);
      if (user) await syncExtensions(user.id);
      console.log('removed', match.name);
      return;
    }
    case 'prelude':
      console.log(extensionPrelude() || '(no enabled extensions)');
      return;
    default:
      die(`unknown ext command "${sub}"`);
  }
}

export async function cmdLib(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case undefined:
    case 'list': {
      const all = cachedLibraries();
      if (!all.length) return console.log('no libraries cached — sdev lib add @user/slug');
      for (const b of all) console.log(`${b.address.padEnd(28)} v${b.version}  ${Object.keys(b.modules).length} module(s)`);
      return;
    }
    case 'add': {
      const ref = rest[0] ?? die('sdev lib add <@user/slug[@version]>');
      const address = parseAddress(ref);
      if (!address) die('use @username/library or @username/library@1.2.0');
      const bundle = await fetchLibrary(address);
      cacheBundle(bundle);
      console.log(`cached ${bundle.address} v${bundle.version}`);
      return;
    }
    case 'remove':
      forgetBundle(rest[0] ?? die('sdev lib remove <@user/slug>'));
      console.log('removed');
      return;
    case 'pins': {
      const refs = libraryReferences(stripSignature(readSource(rest[0] ?? die('sdev lib pins <file>'))));
      console.log(refs.length ? refs.map(formatAddress).join('\n') : 'no library references');
      return;
    }
    case 'export': {
      const out = value('-o', '--out') ?? rest[0] ?? 'sdev-libraries.json';
      writeFileSync(out, exportOfflineBundle());
      console.log('wrote', out);
      return;
    }
    case 'import':
      console.log(`imported ${importOfflineBundle(readSource(rest[0] ?? die('sdev lib import <file>')))} library bundle(s)`);
      return;
    default:
      die(`unknown lib command "${sub}"`);
  }
}
