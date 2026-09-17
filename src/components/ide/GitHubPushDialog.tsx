import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Github, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { IdeFile } from './types';

const TOKEN_KEY = 'sdev:gh:token';
const REPO_KEY = 'sdev:gh:repo';
const BRANCH_KEY = 'sdev:gh:branch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: IdeFile[];
}

const gh = async (token: string, path: string, init?: RequestInit) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string })?.message || `GitHub API ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const b64 = (s: string) => {
  // UTF-8 safe base64
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};

export function GitHubPushDialog({ open, onOpenChange, files }: Props) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('Update from sdev IDE');
  const [createIfMissing, setCreateIfMissing] = useState(true);
  const [makePrivate, setMakePrivate] = useState(true);
  const [rememberToken, setRememberToken] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setToken(localStorage.getItem(TOKEN_KEY) || '');
    setRepo(localStorage.getItem(REPO_KEY) || '');
    setBranch(localStorage.getItem(BRANCH_KEY) || 'main');
    setLastUrl(null);
  }, [open]);

  const handlePush = async () => {
    if (!token.trim()) return toast.error('Personal access token is required');
    if (!repo.trim()) return toast.error('Repository name is required (e.g. my-sdev-project)');
    if (!files.length) return toast.error('No files to push');

    setBusy(true);
    try {
      const user = await gh(token, '/user') as { login: string };
      const [maybeOwner, maybeName] = repo.includes('/') ? repo.split('/') : [user.login, repo];
      const owner = maybeOwner.trim();
      const name = maybeName.trim();

      // Ensure repo exists
      let repoData: { default_branch: string; html_url: string } | null = null;
      try {
        repoData = await gh(token, `/repos/${owner}/${name}`) as typeof repoData;
      } catch (e) {
        if (!createIfMissing) throw e;
        repoData = await gh(token, '/user/repos', {
          method: 'POST',
          body: JSON.stringify({ name, private: makePrivate, auto_init: true, description: 'sdev project' }),
        }) as typeof repoData;
        // small delay for GitHub to initialize
        await new Promise(r => setTimeout(r, 800));
      }

      const targetBranch = branch.trim() || repoData?.default_branch || 'main';

      // Get branch ref
      let baseSha: string | null = null;
      let baseTreeSha: string | null = null;
      try {
        const ref = await gh(token, `/repos/${owner}/${name}/git/ref/heads/${targetBranch}`) as { object: { sha: string } };
        baseSha = ref.object.sha;
        const commit = await gh(token, `/repos/${owner}/${name}/git/commits/${baseSha}`) as { tree: { sha: string } };
        baseTreeSha = commit.tree.sha;
      } catch {
        // empty branch — will create root commit
      }

      // Create blobs
      const tree: Array<{ path: string; mode: '100644'; type: 'blob'; sha: string }> = [];
      for (const f of files) {
        const blob = await gh(token, `/repos/${owner}/${name}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: b64(f.content), encoding: 'base64' }),
        }) as { sha: string };
        tree.push({ path: f.name, mode: '100644', type: 'blob', sha: blob.sha });
      }

      const treeRes = await gh(token, `/repos/${owner}/${name}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ tree, ...(baseTreeSha ? { base_tree: baseTreeSha } : {}) }),
      }) as { sha: string };

      const commitRes = await gh(token, `/repos/${owner}/${name}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: commitMessage || 'Update from sdev IDE',
          tree: treeRes.sha,
          parents: baseSha ? [baseSha] : [],
        }),
      }) as { sha: string };

      if (baseSha) {
        await gh(token, `/repos/${owner}/${name}/git/refs/heads/${targetBranch}`, {
          method: 'PATCH',
          body: JSON.stringify({ sha: commitRes.sha, force: false }),
        });
      } else {
        await gh(token, `/repos/${owner}/${name}/git/refs`, {
          method: 'POST',
          body: JSON.stringify({ ref: `refs/heads/${targetBranch}`, sha: commitRes.sha }),
        });
      }

      const url = `https://github.com/${owner}/${name}/tree/${targetBranch}`;
      setLastUrl(url);
      toast.success(`Pushed ${files.length} file${files.length === 1 ? '' : 's'} to ${owner}/${name}`);

      localStorage.setItem(REPO_KEY, `${owner}/${name}`);
      localStorage.setItem(BRANCH_KEY, targetBranch);
      if (rememberToken) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Push failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-4 h-4" /> Push to GitHub
          </DialogTitle>
          <DialogDescription>
            Upload all open workspace files as a single commit. Needs a{' '}
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=sdev%20IDE" target="_blank" rel="noreferrer" className="underline text-primary inline-flex items-center gap-1">
              personal access token <ExternalLink className="w-3 h-3" />
            </a>{' '}
            with <code className="font-mono">repo</code> scope. Token is stored only in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gh-token" className="text-xs">Personal access token</Label>
            <Input id="gh-token" type="password" placeholder="ghp_..." value={token} onChange={e => setToken(e.target.value)} autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="gh-repo" className="text-xs">Repository</Label>
              <Input id="gh-repo" placeholder="owner/name or name" value={repo} onChange={e => setRepo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-branch" className="text-xs">Branch</Label>
              <Input id="gh-branch" placeholder="main" value={branch} onChange={e => setBranch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gh-msg" className="text-xs">Commit message</Label>
            <Input id="gh-msg" value={commitMessage} onChange={e => setCommitMessage(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={createIfMissing} onCheckedChange={v => setCreateIfMissing(!!v)} /> Create repo if missing
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={makePrivate} onCheckedChange={v => setMakePrivate(!!v)} /> Private
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={rememberToken} onCheckedChange={v => setRememberToken(!!v)} /> Remember token
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Will push <span className="font-mono text-foreground">{files.length}</span> file{files.length === 1 ? '' : 's'} from your current workspace.
          </p>
          {lastUrl && (
            <a href={lastUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1">
              View on GitHub <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button onClick={handlePush} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            {busy ? 'Pushing…' : 'Push'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
