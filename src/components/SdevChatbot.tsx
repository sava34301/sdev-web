import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Bot, User, Loader2, Copy, Check, Sparkles, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { execute, executeAsync } from '@/lang';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SdevChatbotProps {
  onInsertCode?: (code: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sdev-chat`;

export function SdevChatbot({ onInsertCode }: SdevChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const MAX_FIX_ATTEMPTS = 3;

  const fetchStream = useCallback(async (messagesToSend: Message[]): Promise<string> => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: messagesToSend }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${resp.status}`);
    }
    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
              return updated;
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
    return assistantContent;
  }, []);

  const testCodeBlocks = async (content: string): Promise<{ code: string; error: string }[]> => {
    const blocks = extractCodeBlocks(content);
    const errors: { code: string; error: string }[] = [];
    for (const code of blocks) {
      const result = await executeAsync(code);
      if (!result.success && result.error) {
        errors.push({ code, error: result.error });
      }
    }
    return errors;
  };

  const streamChat = useCallback(async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      let conversationHistory = [...newMessages];
      let assistantContent = await fetchStream(conversationHistory);

      // Self-test loop: check generated code and auto-fix
      let fixAttempt = 0;
      while (fixAttempt < MAX_FIX_ATTEMPTS) {
        const errors = testCodeBlocks(assistantContent);
        if (errors.length === 0) break;

        fixAttempt++;
        const errorReport = errors.map((e, i) =>
          `Error ${i + 1} in code block:\n\`\`\`\n${e.code}\n\`\`\`\nError: ${e.error}`
        ).join('\n\n');

        const fixPrompt = `Your code has errors when I try to run it. Please fix ALL errors and give me the corrected complete code.\n\n${errorReport}`;

        // Show testing status
        const testingNote = `\n\n> 🧪 *Testing code... found ${errors.length} error(s). Auto-fixing (attempt ${fixAttempt}/${MAX_FIX_ATTEMPTS})...*\n`;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent + testingNote };
          return updated;
        });

        conversationHistory = [
          ...conversationHistory,
          { role: 'assistant' as const, content: assistantContent },
          { role: 'user' as const, content: fixPrompt },
        ];

        // Replace assistant message for the fix
        assistantContent = '';
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: '' };
          return updated;
        });
        assistantContent = await fetchStream(conversationHistory);
      }

      // Final validation badge
      const finalErrors = testCodeBlocks(assistantContent);
      const badge = finalErrors.length === 0
        ? '\n\n> ✅ *Code tested and verified!*'
        : '\n\n> ⚠️ *Code may still have issues — please review manually.*';

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: assistantContent + badge };
        return updated;
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Chat Error',
        description: error instanceof Error ? error.message : 'Failed to get response',
        variant: 'destructive',
      });
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[i].content !== ''));
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, fetchStream]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    streamChat(userMessage);
  }, [input, isLoading, streamChat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const extractCodeBlocks = (content: string): string[] => {
    const codeBlockRegex = /```(?:sdev)?\n?([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderMessage = (content: string, messageIndex: number) => {
    const parts = content.split(/(```(?:sdev)?\n?[\s\S]*?```)/g);
    let codeBlockIndex = 0;

    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```(?:sdev)?\n?/, '').replace(/```$/, '').trim();
        const currentCodeIndex = codeBlockIndex++;
        const globalIndex = messageIndex * 1000 + currentCodeIndex;

        return (
          <div key={i} className="my-3 rounded-lg overflow-hidden border border-border/50">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50">
              <span className="text-xs font-mono text-primary">sdev</span>
              <div className="flex gap-1">
                <button
                  onClick={() => copyToClipboard(code, globalIndex)}
                  className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy code"
                >
                  {copiedIndex === globalIndex ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {onInsertCode && (
                  <button
                    onClick={() => {
                      onInsertCode(code);
                      toast({ title: 'Code inserted into editor' });
                    }}
                    className="px-2 py-0.5 rounded text-xs bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
                  >
                    Use
                  </button>
                )}
              </div>
            </div>
            <pre className="p-3 text-sm font-mono bg-background/50 overflow-x-auto whitespace-pre-wrap">
              {code}
            </pre>
          </div>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open SDev Assistant chat"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet shadow-neon-cyan flex items-center justify-center transition-all hover:scale-110 ${isOpen ? 'hidden' : ''}`}
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[80vh] rounded-xl border border-border/50 glass shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-neon-cyan/10 to-neon-violet/10 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">SDev Assistant</h3>
                <p className="text-xs text-muted-foreground">Your sdev coding expert</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-violet/20 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Hi! I'm SDev Assistant</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  I can help you learn sdev, write code, debug issues, and build complete projects.
                </p>
                <div className="space-y-2 w-full">
                  {[
                    'How do I write a function in sdev?',
                    'Write a fibonacci sequence',
                    'Create a colorful spiral graphic',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 text-sm transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-primary/20'
                          : 'bg-gradient-to-br from-neon-cyan/30 to-neon-violet/30'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-primary" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div
                      className={`flex-1 rounded-xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted/30 border border-border/50'
                      }`}
                    >
                      {msg.content ? renderMessage(msg.content, i) : (
                        <span className="text-muted-foreground italic">Thinking...</span>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-violet/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 rounded-xl px-4 py-3 bg-muted/30 border border-border/50">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border/50 bg-background/50">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about sdev..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:shadow-neon-cyan transition-all"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                aria-label="Send message"
                className="bg-gradient-to-r from-neon-cyan to-neon-violet hover:shadow-neon-cyan border-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
