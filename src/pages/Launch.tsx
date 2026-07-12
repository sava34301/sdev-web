import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, ArrowRight, Rocket, Calendar, KeyRound, Loader2 } from 'lucide-react';
import { LAUNCH_DATE, isLaunched } from '@/lib/launchGate';
import { getCountdownStrings, formatLaunchDate } from '@/lib/countdownI18n';
import { useAuth } from '@/hooks/useAuth';
import { getGoogleCalendarUrl, getIcsDataUrl } from '@/lib/googleCalendar';
import { redeemInviteCode, hasInviteAccess } from '@/lib/inviteCode';
import { toast } from 'sonner';
import { LaunchAnnouncementCarousel } from '@/components/LaunchAnnouncementCarousel';

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: ms === 0,
  };
}

export default function Launch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = getCountdownStrings();
  const [time, setTime] = useState(() => diff(LAUNCH_DATE));
  const launched = isLaunched();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(diff(LAUNCH_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  const launchLine = t.launchLine(formatLaunchDate(LAUNCH_DATE));
  const calendarUrl = getGoogleCalendarUrl();
  const icsUrl = getIcsDataUrl();

  const handleRedeem = async () => {
    setRedeeming(true);
    const res = await redeemInviteCode(code);
    setRedeeming(false);
    if (res.ok) {
      toast.success(t.inviteValid);
      navigate('/home');
    } else {
      toast.error(t.inviteInvalid);
    }
  };

  const alreadyInvited = hasInviteAccess();

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden flex items-center justify-center px-4 py-12 sky-backdrop">
      <LaunchAnnouncementCarousel />
      <SEO
        title="sdev — Launching July 12, 2026"
        description="sdev officially launches on July 12, 2026. Sign in for early access."
        path="/"
      />
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_60%),radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background)))]" />
      </div>

      <div className="w-full max-w-3xl text-center space-y-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 text-xs text-muted-foreground">
          <Rocket className="h-3.5 w-3.5" /> {launchLine}
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            {launched ? t.launched : t.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">{t.subtitle}</p>
        </div>

        {!launched && (
          <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-2xl mx-auto">
            {([
              [time.days, t.days],
              [time.hours, t.hours],
              [time.minutes, t.minutes],
              [time.seconds, t.seconds],
            ] as const).map(([val, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur p-4 sm:p-6 shadow-lg"
              >
                <div className="text-3xl sm:text-5xl font-mono font-bold tabular-nums">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-2">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {user || launched || alreadyInvited ? (
            <Button size="lg" onClick={() => navigate('/home')} className="gap-2">
              {t.enter} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth"><LogIn className="h-4 w-4" /> {t.signIn}</Link>
              </Button>
            </>
          )}
          <Button asChild variant="outline" size="lg" className="gap-2">
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer" aria-label={t.addToCalendar}>
              <Calendar className="h-4 w-4" /> {t.addToCalendar}
            </a>
          </Button>
          <a href={icsUrl} download="sdev-launch.ics" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
            .ics
          </a>
        </div>

        {/* Invite code */}
        {!user && !launched && !alreadyInvited && (
          <div className="pt-4">
            {!showInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" /> {t.haveInvite}
              </button>
            ) : (
              <div className="max-w-sm mx-auto flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.inviteCodePlaceholder}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                />
                <Button onClick={handleRedeem} disabled={redeeming || !code.trim()}>
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : t.redeem}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
