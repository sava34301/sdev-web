import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Input } from '@/components/ui/input';
import { LogIn, ArrowRight, Calendar, KeyRound, Loader2 } from 'lucide-react';
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
      navigate('/');
    } else {
      toast.error(t.inviteInvalid);
    }
  };

  const alreadyInvited = hasInviteAccess();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="launch-page">
      <LaunchAnnouncementCarousel />
      <SEO
        title="sdev — Launch Milestone Archive"
        description="Archived launch milestone page for the sdev self-hosting programming language."
        path="/launch"
      />
      <SiteNav />

      <main className="wrap flex-1 py-20 sm:py-28 flex flex-col justify-center">
        <div className="border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground flex justify-between">
          <span>Archive · Launch Milestone</span>
          <span>{launchLine}</span>
        </div>

        <div className="mt-12 max-w-4xl">
          <h1 className="font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.04em] sm:text-7xl">
            {launched ? (
              <>{t.launched} — <span className="serif-i font-normal text-primary">sdev is live.</span></>
            ) : (
              <>A self-hosting language <span className="serif-i font-normal text-primary">for everyone.</span></>
            )}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">{t.subtitle}</p>
        </div>

        {!launched && (
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
            <h2 className="sr-only col-span-full">Countdown to launch</h2>
            {([
              [time.days, t.days],
              [time.hours, t.hours],
              [time.minutes, t.minutes],
              [time.seconds, t.seconds],
            ] as const).map(([val, label]) => (
              <div key={label} className="ink rounded-2xl border border-border p-6">
                <div className="font-display text-4xl sm:text-5xl font-extrabold tabular-nums text-[hsl(var(--lime))]">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {user || launched || alreadyInvited ? (
            <button onClick={() => navigate('/')} className="btn-ink">
              {t.enter} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link to="/auth" className="btn-ink">
              <LogIn className="h-4 w-4" /> {t.signIn}
            </Link>
          )}
          <Link to="/ide" className="btn-line">Open the IDE</Link>
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer" aria-label={t.addToCalendar} className="btn-line">
            <Calendar className="h-4 w-4" /> {t.addToCalendar}
          </a>
          <a href={icsUrl} download="sdev-launch.ics" className="px-2 font-mono text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
            .ics
          </a>
        </div>

        {!user && !launched && !alreadyInvited && (
          <div className="mt-8">
            {!showInvite ? (
              <button
                onClick={() => setShowInvite(true)}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" /> {t.haveInvite}
              </button>
            ) : (
              <div className="max-w-sm flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t.inviteCodePlaceholder}
                  autoFocus
                  className="rounded-full bg-card"
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                />
                <button onClick={handleRedeem} disabled={redeeming || !code.trim()} className="btn-ink shrink-0 disabled:opacity-50">
                  {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : t.redeem}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
