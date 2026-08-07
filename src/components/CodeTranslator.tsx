import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Wand2, Copy, Check, Zap, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { execute, executeAsync } from '@/lang';

const LANGUAGES = [
  { value: 'html-css-js', label: 'HTML/CSS/JS Website', extensions: ['.html', '.htm'] },
  { value: 'python', label: 'Python', extensions: ['.py'] },
  { value: 'javascript', label: 'JavaScript', extensions: ['.js', '.mjs'] },
  { value: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { value: 'java', label: 'Java', extensions: ['.java'] },
  { value: 'csharp', label: 'C#', extensions: ['.cs'] },
  { value: 'cpp', label: 'C++', extensions: ['.cpp', '.cc', '.cxx'] },
  { value: 'c', label: 'C', extensions: ['.c', '.h'] },
  { value: 'go', label: 'Go', extensions: ['.go'] },
  { value: 'rust', label: 'Rust', extensions: ['.rs'] },
  { value: 'ruby', label: 'Ruby', extensions: ['.rb'] },
  { value: 'php', label: 'PHP', extensions: ['.php'] },
  { value: 'swift', label: 'Swift', extensions: ['.swift'] },
  { value: 'kotlin', label: 'Kotlin', extensions: ['.kt', '.kts'] },
  { value: 'lua', label: 'Lua', extensions: ['.lua'] },
  { value: 'html', label: 'HTML (markup only)', extensions: [] },
  { value: 'css', label: 'CSS (standalone)', extensions: ['.css'] },
];

interface CodeTranslatorProps {
  onTranslated?: (code: string) => void;
}

export function CodeTranslator({ onTranslated }: CodeTranslatorProps) {
  const [sourceLanguage, setSourceLanguage] = useState('python');
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'passed' | 'failed'>('idle');
  const { toast } = useToast();

  const MAX_FIX_ATTEMPTS = 3;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const detectedLang = LANGUAGES.find(lang => 
      lang.extensions.includes(extension)
    );
    
    if (detectedLang) {
      setSourceLanguage(detectedLang.value);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputCode(content);
    };
    reader.readAsText(file);
  }, []);

  const translateOnce = useCallback(async (code: string, lang: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('translate-code', {
      body: { code, sourceLanguage: lang },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.translatedCode || '';
  }, []);

  const fixCode = useCallback(async (brokenCode: string, errorMsg: string): Promise<string> => {
    const fixPrompt = `This sdev code has an error. Fix it and return ONLY the corrected sdev code with no markdown fences:\n\nCode:\n${brokenCode}\n\nError: ${errorMsg}`;
    const { data, error } = await supabase.functions.invoke('translate-code', {
      body: { code: fixPrompt, sourceLanguage: 'sdev-fix' },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.translatedCode || '';
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!inputCode.trim()) {
      toast({
        title: "No code provided",
        description: "Please paste or upload some code to translate.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    setOutputCode('');
    setTestStatus('idle');

    try {
      let translated = await translateOnce(inputCode, sourceLanguage);
      setOutputCode(translated);

      // Self-test loop
      for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
        setTestStatus('testing');
        const result = await executeAsync(translated);
        
        if (result.success) {
          setTestStatus('passed');
          toast({
            title: "✅ Translation complete & verified!",
            description: "Code was tested and runs without errors.",
          });
          onTranslated?.(translated);
          return;
        }

        // Error found — try to fix
        if (attempt < MAX_FIX_ATTEMPTS - 1) {
          toast({
            title: `🧪 Test failed (attempt ${attempt + 1}/${MAX_FIX_ATTEMPTS})`,
            description: `Fixing: ${result.error}`,
          });
          translated = await fixCode(translated, result.error || 'Unknown error');
          setOutputCode(translated);
        }
      }

      // Final check after all attempts
      const finalResult = await executeAsync(translated);
      if (finalResult.success) {
        setTestStatus('passed');
        toast({ title: "✅ Translation complete & verified!" });
      } else {
        setTestStatus('failed');
        toast({
          title: "⚠️ Translation complete with warnings",
          description: "Code may still have issues. Please review manually.",
          variant: "destructive",
        });
      }
      onTranslated?.(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setTestStatus('idle');
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  }, [inputCode, sourceLanguage, onTranslated, toast, translateOnce, fixCode]);

  const handleCopy = useCallback(() => {
    if (outputCode) {
      navigator.clipboard.writeText(outputCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [outputCode]);

  const handleUseInEditor = useCallback(() => {
    if (outputCode && onTranslated) {
      onTranslated(outputCode);
      toast({
        title: "Code loaded",
        description: "The translated code has been loaded into the editor.",
      });
    }
  }, [outputCode, onTranslated, toast]);

  return (
    <div className="rounded-lg border border-border/50 glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-secondary" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Translator</span>
        </div>
        <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
          <SelectTrigger className="w-[130px] h-8 text-xs border-border/50 bg-background/50">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 space-y-4">
        <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as 'paste' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/30">
            <TabsTrigger value="paste" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Paste Code
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-3">
            <textarea
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder={sourceLanguage === 'html-css-js' ? '<!-- Paste your full HTML file here (with <style> and <script> tags) -->' : `// Paste your ${LANGUAGES.find(l => l.value === sourceLanguage)?.label || ''} code here...`}
              className="w-full h-36 p-3 font-mono text-sm bg-background/50 border border-border/50 rounded-lg resize-none focus:outline-none focus:border-primary/50 focus:shadow-neon-cyan text-foreground placeholder:text-muted-foreground transition-all"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <label className="flex flex-col items-center justify-center w-full h-36 border border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-all bg-background/30 group">
              <Upload className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Click to upload</span>
              <span className="text-xs text-muted-foreground/50 mt-1 font-mono">
                .html .py .js .ts .java .go .rs ...
              </span>
              <input
                type="file"
                className="hidden"
                accept={LANGUAGES.flatMap(l => l.extensions).join(',')}
                onChange={handleFileUpload}
              />
            </label>
            {inputCode && inputMethod === 'upload' && (
              <div className="flex items-center gap-2 mt-2 text-xs text-neon-green">
                <Check className="w-3 h-3" />
                <span className="font-mono">File loaded ({inputCode.split('\n').length} lines)</span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleTranslate}
          disabled={isTranslating || !inputCode.trim()}
          className="w-full gap-2 bg-gradient-to-r from-secondary to-neon-violet hover:shadow-neon-magenta transition-all border-0 font-semibold"
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono">Translating...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span className="font-mono">Translate to SDEV</span>
            </>
          )}
        </Button>

        {outputCode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-primary flex items-center gap-2">
                {'>'} output.sdev
                {testStatus === 'passed' && (
                  <span className="flex items-center gap-1 text-neon-green">
                    <FlaskConical className="w-3 h-3" /> Verified
                  </span>
                )}
                {testStatus === 'failed' && (
                  <span className="flex items-center gap-1 text-destructive">
                    <FlaskConical className="w-3 h-3" /> Review needed
                  </span>
                )}
                {testStatus === 'testing' && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Testing...
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                {onTranslated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseInEditor}
                    className="h-7 text-xs border-primary/30 hover:border-primary hover:bg-primary/10"
                  >
                    Use in Editor
                  </Button>
                )}
              </div>
            </div>
            <pre className="w-full max-h-48 p-3 font-mono text-sm bg-background/50 border border-border/50 rounded-lg overflow-auto text-foreground whitespace-pre-wrap">
              {outputCode}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
