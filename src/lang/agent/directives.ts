/**
 * Agent directives.
 *
 * A file can steer the understanding agent with a single comment-like line:
 *
 *   !#agent:off        never touch this file
 *   !#agent:on         rules + memory + AI brain (same as auto)
 *   !#agent:auto       rules + memory, AI only when the file still looks wrong
 *   !#agent:local      brain runs on the user's own machine/endpoint
 *   !#agent:online     brain runs on the website (edge function)
 *   !#agent:strict     rewrite nothing the agent is not confident about
 *   !#agent:learn:off  do not remember anything from this file
 *
 * Directives may appear anywhere in the file and are stripped before the
 * lexer ever sees the source.
 */

export type AgentMode = 'off' | 'auto' | 'on' | 'strict';
export type BrainMode = 'auto' | 'local' | 'online' | 'none';

export interface AgentDirectives {
  mode: AgentMode | null;
  brain: BrainMode | null;
  learn: boolean | null;
}

const DIRECTIVE_RE = /^\s*!#\s*agent\s*:\s*([a-z]+)(?:\s*:\s*([a-z]+))?\s*$/i;

export interface DirectiveScan extends AgentDirectives {
  /** the source with every directive line removed (line count preserved) */
  source: string;
  found: boolean;
}

export function scanDirectives(source: string): DirectiveScan {
  let mode: AgentMode | null = null;
  let brain: BrainMode | null = null;
  let learn: boolean | null = null;
  let found = false;

  const lines = source.split('\n').map((line) => {
    const m = line.match(DIRECTIVE_RE);
    if (!m) return line;
    found = true;
    const head = m[1].toLowerCase();
    const tail = (m[2] ?? '').toLowerCase();

    switch (head) {
      case 'off':
        mode = 'off';
        break;
      case 'on':
        mode = mode === 'off' ? 'on' : (mode ?? 'on');
        break;
      case 'auto':
        mode = mode ?? 'auto';
        brain = 'auto';
        break;
      case 'strict':
        mode = 'strict';
        break;
      case 'local':
        brain = 'local';
        mode = mode ?? 'on';
        break;
      case 'online':
        brain = 'online';
        mode = mode ?? 'on';
        break;
      case 'nobrain':
      case 'rules':
        brain = 'none';
        break;
      case 'learn':
        learn = tail !== 'off' && tail !== 'no';
        break;
      default:
        break;
    }
    // keep the line slot so error line numbers stay truthful
    return '';
  });

  return { mode, brain, learn, found, source: lines.join('\n') };
}

/** The directive line the agent writes when it promotes settings into a file. */
export function directiveLine(mode: AgentMode, brain?: BrainMode): string {
  if (mode === 'off') return '!#agent:off';
  if (brain && brain !== 'auto' && brain !== 'none') return `!#agent:${brain}`;
  return `!#agent:${mode}`;
}
