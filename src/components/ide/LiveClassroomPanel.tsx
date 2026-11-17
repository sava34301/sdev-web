import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Radio,
  Copy,
  Check,
  Send,
  GraduationCap,
  ShieldCheck,
  Terminal,
  LogOut,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/useClipboard';
import {
  LiveRoomSession,
  generateRoomCode,
  type RoomRole,
  type PeerPresence,
  type SharedExecutionEntry,
  type CrdtSnapshot,
} from '@/lang/collab/live-room';
import { toast } from 'sonner';

export interface LiveClassroomPanelProps {
  fileName: string;
  content: string;
  cursor: { line: number; col: number };
  lastOutput: string[];
  lastError?: string;
  onApplyRemoteCode: (code: string, fromAuthor: string, isTeacherBroadcast: boolean) => void;
  onJumpToLine?: (line: number) => void;
}

export function LiveClassroomPanel({
  fileName,
  content,
  cursor,
  lastOutput,
  lastError,
  onApplyRemoteCode,
  onJumpToLine,
}: LiveClassroomPanelProps) {
  const [roomInput, setRoomInput] = useState<string>(() => generateRoomCode());
  const [role, setRole] = useState<RoomRole>('peer');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [session, setSession] = useState<LiveRoomSession | null>(null);
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [sharedExecs, setSharedExecs] = useState<SharedExecutionEntry[]>([]);
  const [pendingSnapshot, setPendingSnapshot] = useState<{
    snapshot: CrdtSnapshot;
    isTeacher: boolean;
  } | null>(null);
  const { copied, copy } = useClipboard({ timeoutMs: 1500 });

  const sessionRef = useRef<LiveRoomSession | null>(null);
  const suppressOutgoingRef = useRef(false);

  const startRoom = useCallback(
    (codeToJoin: string, selectedRole: RoomRole) => {
      const cleanCode = codeToJoin.trim().toUpperCase();
      if (!cleanCode) {
        toast.error('Enter a room code first.');
        return;
      }
      sessionRef.current?.disconnect();

      const live = new LiveRoomSession(cleanCode, selectedRole, content, fileName, {
        onPeersChanged: (list) => setPeers(list),
        onRemoteDocument: (snap, isTeacherBroadcast) => {
          if (autoSync || isTeacherBroadcast) {
            suppressOutgoingRef.current = true;
            onApplyRemoteCode(snap.content, snap.authorPeerId, isTeacherBroadcast);
            if (isTeacherBroadcast) {
              toast.info('Teacher broadcasted updated lesson code');
            }
          } else {
            setPendingSnapshot({ snapshot: snap, isTeacher: isTeacherBroadcast });
          }
        },
        onExecutionShared: (entry) => {
          setSharedExecs((prev) => [entry, ...prev].slice(0, 20));
        },
      });

      sessionRef.current = live;
      setSession(live);
      setPeers(live.getPeers());
      toast.success(`Joined Live Room #${cleanCode} as ${selectedRole}`);
    },
    [content, fileName, autoSync, onApplyRemoteCode]
  );

  const leaveRoom = useCallback(() => {
    sessionRef.current?.disconnect();
    sessionRef.current = null;
    setSession(null);
    setPeers([]);
    setPendingSnapshot(null);
    toast.message('Disconnected from Live Room');
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  // Broadcast cursor changes
  useEffect(() => {
    if (!session) return;
    session.updateCursor(cursor.line, cursor.col, fileName);
  }, [cursor.line, cursor.col, fileName, session]);

  // Broadcast local document edits when autoSync is active
  useEffect(() => {
    if (!session || !autoSync) return;
    if (suppressOutgoingRef.current) {
      suppressOutgoingRef.current = false;
      return;
    }
    session.pushDocumentChange(content, fileName, false);
  }, [content, fileName, session, autoSync]);

  const handleRoleChange = (nextRole: RoomRole) => {
    setRole(nextRole);
    session?.setRole(nextRole);
  };

  const handleBroadcastNow = () => {
    if (!session) return;
    const isTeacher = role === 'teacher';
    session.pushDocumentChange(content, fileName, isTeacher);
    toast.success(
      isTeacher
        ? 'Broadcasted teacher code to all classroom students'
        : 'Pushed current file snapshot to room peers'
    );
  };

  const handleShareOutput = () => {
    if (!session) return;
    const entry = session.shareExecutionOutput(fileName, lastOutput, lastError);
    setSharedExecs((prev) => [entry, ...prev].slice(0, 20));
    toast.success('Shared execution output with room');
  };

  const copyRoomInvite = () => {
    if (!session) return;
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/ide?room=${session.roomCode}`
        : session.roomCode;
    copy(url);
    toast.success(`Copied invite link for room #${session.roomCode}`);
  };

  return (
    <div className="flex flex-col h-full bg-background/40 text-foreground text-xs select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Live Classroom &amp; Pair Rooms
          </span>
        </div>
        {session && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            #{session.roomCode}
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Privacy & Sandbox Banner */}
        <div className="rounded border border-primary/25 bg-primary/5 p-2 flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="text-foreground font-medium">Sandboxed Ephemeral CRDT Room:</span>{' '}
            Uses anonymous pseudonyms and Lamport-clock synchronization. Remote code never auto-executes without your click.
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Your Room Role
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'peer', label: 'Peer (Pair)' },
                { id: 'teacher', label: 'Teacher' },
                { id: 'student', label: 'Student' },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleChange(r.id)}
                className={`py-1 px-2 rounded font-mono text-[11px] border transition-colors ${
                  role === r.id
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-background/50 text-muted-foreground border-border/40 hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connect / Active Session Controls */}
        {!session ? (
          <div className="space-y-2 rounded border border-border/50 bg-card/60 p-2.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Room Code (Open a second tab to test live sync)
            </label>
            <div className="flex gap-1.5">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="ROOM6X"
                maxLength={10}
                className="h-7 flex-1 rounded border border-border/60 bg-background px-2 font-mono text-xs uppercase outline-none focus:border-primary"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setRoomInput(generateRoomCode())}
                title="Generate new room code"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={() => startRoom(roomInput, role)}
            >
              <Radio className="w-3.5 h-3.5" /> Start / Join Live Room
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Self Identity & Invite */}
            <div className="rounded border border-border/50 bg-card/70 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: session.self.color }}
                  />
                  <span className="font-semibold">{session.self.displayName}</span>
                  <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground">
                    you ({role})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={copyRoomInvite}
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Invite
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] text-destructive"
                    onClick={leaveRoom}
                    title="Leave room"
                  >
                    <LogOut className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Auto-apply CRDT edits
                </span>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="accent-primary cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant={role === 'teacher' ? 'default' : 'outline'}
                  className="h-7 text-[11px] gap-1"
                  onClick={handleBroadcastNow}
                >
                  {role === 'teacher' ? (
                    <>
                      <GraduationCap className="w-3 h-3" /> Broadcast Lesson
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" /> Push Code
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1"
                  onClick={handleShareOutput}
                >
                  <Terminal className="w-3 h-3" /> Share Output
                </Button>
              </div>
            </div>

            {/* Pending Remote Snapshot Prompt (when autoSync is off) */}
            {pendingSnapshot && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 space-y-1.5">
                <div className="text-[11px] text-amber-300 font-mono">
                  Incoming update ({pendingSnapshot.snapshot.fileName}, clock #{pendingSnapshot.snapshot.clock})
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-6 text-[10px] flex-1"
                    onClick={() => {
                      onApplyRemoteCode(
                        pendingSnapshot.snapshot.content,
                        pendingSnapshot.snapshot.authorPeerId,
                        pendingSnapshot.isTeacher
                      );
                      setPendingSnapshot(null);
                    }}
                  >
                    Accept Code
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px]"
                    onClick={() => setPendingSnapshot(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Connected Peers List */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Connected Peers ({peers.length})</span>
                <span>Live Cursors</span>
              </div>
              {peers.length === 0 ? (
                <div className="rounded border border-border/30 bg-background/40 p-2.5 text-[11px] text-muted-foreground/60 font-mono text-center">
                  Waiting for peers in #{session.roomCode}… Open another browser tab on #
                  {session.roomCode} to pair-program live.
                </div>
              ) : (
                <div className="space-y-1">
                  {peers.map((p) => (
                    <button
                      key={p.peerId}
                      type="button"
                      onClick={() => onJumpToLine?.(p.cursor.line)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded border border-border/40 bg-background/60 hover:border-primary/40 font-mono text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-semibold truncate">{p.displayName}</span>
                        <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground">
                          {p.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-primary shrink-0">
                        L{p.cursor.line}:C{p.cursor.col}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Execution Feed */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Shared Classroom Output Feed ({sharedExecs.length})
              </div>
              {sharedExecs.length === 0 ? (
                <div className="rounded border border-border/30 bg-background/40 p-2 text-[11px] text-muted-foreground/50 italic text-center">
                  No shared runs yet. Click &ldquo;Share Output&rdquo; to broadcast your terminal result.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {sharedExecs.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded border border-border/40 bg-background/70 p-2 font-mono text-[10px] space-y-1"
                    >
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {ex.displayName} ({ex.role})
                        </span>
                        <span>{ex.fileName}</span>
                      </div>
                      {ex.error ? (
                        <div className="text-destructive truncate">{ex.error}</div>
                      ) : (
                        <div className="text-emerald-300/90 space-y-0.5">
                          {ex.output.slice(0, 4).map((ln, i) => (
                            <div key={i} className="truncate">
                              &gt; {ln}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
