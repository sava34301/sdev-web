import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Wand2, Check, AlertTriangle, Loader2, RotateCcw, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FixResult {
  fixed_code: string;
  explanation: string;
  changes: string;
  how_it_works: string;
  confidence: 'high' | 'medium' | 'low';
}

interface Props {
  code: string;
  fileName?: string;
  error?: string;
  problemSummary?: string;
  onApply: (fixedCode: string) => void;
}

export function IdeAssistantPanel({ code, fileName, error, problemSummary, onApply }: Props) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const runFix = async () => {
    if (!code.trim()) { toast.error('No code to analyze'); return; }
    setLoading(true); setErrMsg(null); setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('sdev-fix', {
        body: { code, error: error || problemSummary || '', note },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as FixResult);
    } catch (e: any) {
      const m = e?.message || 'Failed to get a fix';
      setErrMsg(m);
      toast.error(m);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result.fixed_code);
    toast.success('Applied automatic fix to current file');
  };

  const confidenceColor = result?.confidence === 'high'
    ? 'text-neon-green' : result?.confidence === 'medium' ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="flex flex-col h-full bg-background/40 text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/10 flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">SDev Doctor</span>
        {fileName && <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono"><FileCode className="w-3 h-3" />{fileName}</span>}
      </div>

      <div className="p-3 space-y-2 border-b border-border/30 flex-shrink-0">
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional: describe what you're trying to do or what's wrong…"
          className="min-h-[60px] text-xs font-mono bg-muted/20 border-border/40"
        />
        <div className="flex gap-2">
          <Button onClick={runFix} disabled={loading} size="sm" className="flex-1 h-8 text-xs gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {loading ? 'Diagnosing…' : 'Fix & Explain'}
          </Button>
          {result && (
            <Button onClick={() => { setResult(null); setErrMsg(null); }} variant="outline" size="sm" className="h-8 text-xs gap-1">
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          )}
        </div>
        {(error || problemSummary) && !result && (
          <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="font-mono whitespace-pre-wrap line-clamp-3">{error || problemSummary}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {!result && !errMsg && !loading && (
          <div className="text-muted-foreground/60 text-[11px] leading-relaxed space-y-2">
            <p>Hi! I'm <span className="text-primary font-semibold">SDev Doctor</span>.</p>
            <p>Click <strong>Fix &amp; Explain</strong> and I'll:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Read your current file (and any error)</li>
              <li>Repair broken syntax & logic</li>
              <li>Explain what the program does</li>
              <li>Walk you through every change I made</li>
              <li>Describe how the fixed version works</li>
            </ul>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing your code…</div>
        )}

        {errMsg && (
          <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">{errMsg}</div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${confidenceColor}`}>
                ● confidence: {result.confidence}
              </span>
              <Button onClick={apply} size="sm" className="h-7 text-[11px] gap-1 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green border border-brand-green/30">
                <Check className="w-3 h-3" /> Apply fix
              </Button>
            </div>

            <Section title="What this code does">
              <ReactMarkdown>{result.explanation}</ReactMarkdown>
            </Section>

            <Section title="What I changed">
              <ReactMarkdown>{result.changes}</ReactMarkdown>
            </Section>

            <Section title="How it works now">
              <ReactMarkdown>{result.how_it_works}</ReactMarkdown>
            </Section>

            <Section title="Fixed code">
              <pre className="text-[11px] font-mono bg-muted/30 p-2 rounded border border-border/40 overflow-auto max-h-64 whitespace-pre-wrap">
                {result.fixed_code}
              </pre>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1">{title}</div>
      <div className="prose prose-invert prose-sm max-w-none text-[11px] leading-relaxed
                      [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0
                      [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted/50 [&_code]:text-primary [&_code]:text-[10px]">
        {children}
      </div>
    </div>
  );
}
