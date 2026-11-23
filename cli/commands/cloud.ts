import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { checksum, writeSignature, stripSignature } from '@/lang/dialect/signature';
import { libraryReferences } from '@/lang/dialect/registry';
import { formatAddress } from '@/lang/dialect/address';
import { die, flag, value } from '../args';
import {
  currentUser, requireUser, ensureSession, signOut, signInWithPassword, signUpWithPassword,
  sendEmailCode, verifyEmailCode, signInWithTokens, sendPasswordReset, sessionFile, storedSummary,
} from '../auth';
import { db, myUsername } from '../cloud';
import { readSource } from '../pipeline';
import { ask, password as readPassword } from '../prompt';
import { activeDialect, runtimePreference } from '../store';
import { SITE } from '../version';

export async function cmdAuth(sub: string, rest: string[]): Promise<void> {
  switch (sub) {
    case 'login': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth login <email>');
      const pw = await readPassword(value('--password'));
      const user = await signInWithPassword(email, pw);
      console.log('signed in as', user.email);
      return;
    }
    case 'signup': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth signup <email>');
      const pw = await readPassword(value('--password'), 'choose a password: ');
      if (pw.length < 6) die('use at least 6 characters');
      const { needsConfirmation } = await signUpWithPassword(email, pw, value('--name'));
      console.log(needsConfirmation
        ? `account created — open the confirmation link we emailed to ${email}, then: sdev auth login ${email}`
        : `signed in as ${email}`);
      return;
    }
    case 'code': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth code <email>');
      await sendEmailCode(email, flag('--new'));
      console.log(`a one-time code is on its way to ${email}`);
      const code = rest[1] ?? (await ask('code: '));
      if (!code) return console.log(`when it arrives, run: sdev auth code ${email} <code>`);
      const user = await verifyEmailCode(email, code);
      console.log('signed in as', user.email);
      return;
    }
    case 'token': {
      const access = rest[0] ?? (await ask('access token: '));
      const refresh = rest[1] ?? (await ask('refresh token: '));
      if (!access || !refresh) die('sdev auth token <access-token> <refresh-token>');
      const user = await signInWithTokens(access, refresh);
      console.log('signed in as', user.email);
      return;
    }
    case 'reset': {
      const email = rest[0] ?? (await ask('email: '));
      if (!email) die('sdev auth reset <email>');
      await sendPasswordReset(email);
      console.log(`password reset link sent to ${email}`);
      return;
    }
    case 'refresh': {
      const session = await ensureSession();
      console.log(session ? 'session refreshed for ' + session.user.email : 'not signed in');
      return;
    }
    case 'logout':
      await signOut();
      return console.log('signed out');
    case 'status':
    case undefined:
    case 'whoami': {
      const user = await currentUser();
      if (!user) {
        const stored = storedSummary();
        console.log(stored
          ? `signed out — the saved session for ${stored.email ?? 'your account'} expired.\nsign in again: sdev auth login ${stored.email ?? '<email>'}`
          : 'not signed in — sdev auth login <email>  or  sdev auth code <email>');
        return;
      }
      const handle = await myUsername(user.id);
      console.log(`${user.email}${handle ? ' · @' + handle : ''}`);
      if (sub === 'status') console.log('session file: ' + sessionFile());
      return;
    }
    default:
      die('auth: use login | signup | code | token | reset | refresh | status | logout');
  }
}

export async function cmdCloud(sub: string, rest: string[]): Promise<void> {
  const user = await requireUser();
  if (sub === 'list' || sub === undefined) {
    const { data, error } = await db.from('code_files').select('name, updated_at, dialect_slug, runtime').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) die(error.message);
    for (const f of data ?? []) console.log(`${String(f.name).padEnd(28)} ${new Date(f.updated_at).toLocaleString()}  ${f.runtime ?? 'v1'}  ${f.dialect_slug ?? 'canonical'}`);
    if (!data?.length) console.log('no files in the cloud yet');
    return;
  }
  if (sub === 'pull') {
    const { data, error } = await db.from('code_files').select('name, content').eq('user_id', user.id);
    if (error) die(error.message);
    const wanted = rest[0];
    const rows = (data ?? []).filter((f: { name: string }) => !wanted || f.name === wanted);
    if (!rows.length) die('nothing to pull');
    const dir = value('-o', '--out') ?? '.';
    mkdirSync(dir, { recursive: true });
    for (const f of rows) {
      writeFileSync(resolve(dir, f.name), stripSignature(f.content ?? ''));
      console.log('pulled', f.name);
    }
    return;
  }
  if (sub === 'push') {
    const file = rest[0] ?? die('sdev cloud push <file>');
    const body = stripSignature(readSource(file));
    const dialect = activeDialect();
    const libs = libraryReferences(body).map(formatAddress);
    const runtime = runtimePreference();
    const signed = writeSignature(body, {
      rt: runtime,
      dialect: dialect?.meta.slug ?? null,
      dialectVersion: dialect?.meta.version ?? null,
      libs,
      origin: null,
    });
    const name = basename(file);
    const mirror = { dialect_slug: dialect?.meta.slug ?? null, dialect_version: dialect?.meta.version ?? null, runtime, lib_pins: libs };
    const { data: existing, error: lookupErr } = await db.from('code_files').select('id').eq('user_id', user.id).eq('name', name).maybeSingle();
    if (lookupErr) die(lookupErr.message);
    const { error } = existing?.id
      ? await db.from('code_files').update({ content: signed, ...mirror }).eq('id', existing.id).eq('user_id', user.id)
      : await db.from('code_files').insert({ user_id: user.id, name, content: signed, language: 'sdev', ...mirror });
    if (error) die(error.message);
    console.log('pushed', name);
    return;
  }
  if (sub === 'rm') {
    const name = rest[0] ?? die('sdev cloud rm <name>');
    const { error } = await db.from('code_files').delete().eq('user_id', user.id).eq('name', name);
    if (error) die(error.message);
    console.log('removed', name);
    return;
  }
  if (sub === 'share') {
    const file = rest[0] ?? die('sdev cloud share <file>');
    const body = stripSignature(readSource(file));
    const title = value('--name') ?? basename(file);
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'program'}-${checksum(body).slice(0, 6)}`;
    const { error } = await db.from('gists').insert({
      user_id: user.id, slug, title, description: value('--about') ?? null, content: body, language: 'sdev',
    });
    if (error) die(error.message);
    console.log(`shared — ${SITE}/g/${slug}`);
    return;
  }
  if (sub === 'shared') {
    const { data, error } = await db.from('gists').select('slug, title, view_count').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) die(error.message);
    for (const g of data ?? []) console.log(`${String(g.title).padEnd(30)} /g/${g.slug}  ${g.view_count ?? 0} views`);
    if (!data?.length) console.log('nothing shared yet');
    return;
  }
  die('cloud: use list | pull | push | rm | share | shared');
}
