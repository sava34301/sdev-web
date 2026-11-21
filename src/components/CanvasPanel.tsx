import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { GraphicsCommand, TurtleState, SpriteData } from '@/lang/graphics';
import { X } from 'lucide-react';

interface CanvasPanelProps {
  commands: GraphicsCommand[];
  onClose?: () => void;
}

export interface CanvasHandle {
  clear: () => void;
  getDataUrl: () => string;
}

export const CanvasPanel = forwardRef<CanvasHandle, CanvasPanelProps>(({ commands, onClose }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasSize = [...commands].reverse().find((cmd) => cmd.type === 'canvas');
  const displayWidth = (canvasSize?.width as number | undefined) ?? 400;
  const displayHeight = (canvasSize?.height as number | undefined) ?? 400;
  const turtleRef = useRef<TurtleState>({
    x: 200,
    y: 200,
    angle: -90,
    penDown: true,
    color: '#00ff88',
    width: 2,
  });

  useImperativeHandle(ref, () => ({
    clear: () => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (ctx && canvas) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
    getDataUrl: () => canvasRef.current?.toDataURL() ?? '',
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    ctxRef.current = canvas.getContext('2d');
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Initialize
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    let currentFill: string | null = '#00ff88';
    let currentStroke: string | null = '#00ff88';
    let currentWidth = 2;
    let currentFont = '16px monospace';
    let currentFontFamily = 'monospace';
    let hasFill = true;
    let hasStroke = true;

    for (const cmd of commands) {
      switch (cmd.type) {
        // ========== Canvas Setup ==========
        case 'canvas':
          canvas.width = cmd.width as number;
          canvas.height = cmd.height as number;
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
          
        case 'clear':
        case 'background':
          ctx.fillStyle = cmd.color as string;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
          
        // ========== Drawing State ==========
        case 'fill':
          currentFill = cmd.color as string;
          hasFill = true;
          break;

        case 'noFill':
          hasFill = false;
          break;
          
        case 'stroke':
          currentStroke = cmd.color as string;
          if (cmd.width) currentWidth = cmd.width as number;
          hasStroke = true;
          break;

        case 'noStroke':
          hasStroke = false;
          break;

        case 'lineWidth':
          currentWidth = cmd.width as number;
          break;

        case 'lineCap':
          ctx.lineCap = cmd.cap as CanvasLineCap;
          break;

        case 'lineJoin':
          ctx.lineJoin = cmd.join as CanvasLineJoin;
          break;

        case 'alpha':
          ctx.globalAlpha = cmd.value as number;
          break;

        case 'shadow':
          ctx.shadowColor = cmd.color as string;
          ctx.shadowBlur = cmd.blur as number;
          ctx.shadowOffsetX = cmd.offsetX as number;
          ctx.shadowOffsetY = cmd.offsetY as number;
          break;

        case 'noShadow':
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          break;

        // ========== Basic Shapes ==========
        case 'rect': {
          const radius = cmd.radius as number ?? 0;
          if (radius > 0) {
            ctx.beginPath();
            ctx.roundRect(cmd.x as number, cmd.y as number, cmd.w as number, cmd.h as number, radius);
            if (hasFill && currentFill) {
              ctx.fillStyle = currentFill;
              ctx.fill();
            }
            if (hasStroke && currentStroke) {
              ctx.strokeStyle = currentStroke;
              ctx.lineWidth = currentWidth;
              ctx.stroke();
            }
          } else {
            if (hasFill && currentFill) {
              ctx.fillStyle = currentFill;
              ctx.fillRect(cmd.x as number, cmd.y as number, cmd.w as number, cmd.h as number);
            }
            if (hasStroke && currentStroke) {
              ctx.strokeStyle = currentStroke;
              ctx.lineWidth = currentWidth;
              ctx.strokeRect(cmd.x as number, cmd.y as number, cmd.w as number, cmd.h as number);
            }
          }
          break;
        }
          
        case 'circle':
          ctx.beginPath();
          ctx.arc(cmd.x as number, cmd.y as number, cmd.r as number, 0, Math.PI * 2);
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;

        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(
            cmd.x as number, cmd.y as number,
            cmd.rx as number, cmd.ry as number,
            cmd.rotation as number ?? 0,
            0, Math.PI * 2
          );
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;

        case 'arc':
          ctx.beginPath();
          ctx.arc(
            cmd.x as number, cmd.y as number,
            cmd.r as number,
            cmd.start as number, cmd.end as number,
            cmd.ccw as boolean
          );
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;
          
        case 'line':
          ctx.beginPath();
          ctx.moveTo(cmd.x1 as number, cmd.y1 as number);
          ctx.lineTo(cmd.x2 as number, cmd.y2 as number);
          ctx.strokeStyle = currentStroke ?? '#00ff88';
          ctx.lineWidth = currentWidth;
          ctx.stroke();
          break;

        case 'point': {
          const size = cmd.size as number ?? 1;
          ctx.beginPath();
          ctx.arc(cmd.x as number, cmd.y as number, size / 2, 0, Math.PI * 2);
          ctx.fillStyle = currentFill ?? currentStroke ?? '#00ff88';
          ctx.fill();
          break;
        }

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(cmd.x1 as number, cmd.y1 as number);
          ctx.lineTo(cmd.x2 as number, cmd.y2 as number);
          ctx.lineTo(cmd.x3 as number, cmd.y3 as number);
          ctx.closePath();
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;
          
        case 'polygon': {
          const pts = cmd.points as number[][];
          if (pts.length > 0) {
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i][0], pts[i][1]);
            }
            ctx.closePath();
            if (hasFill && currentFill) {
              ctx.fillStyle = currentFill;
              ctx.fill();
            }
            if (hasStroke && currentStroke) {
              ctx.strokeStyle = currentStroke;
              ctx.lineWidth = currentWidth;
              ctx.stroke();
            }
          }
          break;
        }

        case 'star': {
          const x = cmd.x as number;
          const y = cmd.y as number;
          const outer = cmd.outer as number;
          const inner = cmd.inner as number;
          const points = cmd.points as number ?? 5;
          ctx.beginPath();
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const px = x + r * Math.cos(angle);
            const py = y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;
        }

        case 'heart': {
          const hx = cmd.x as number;
          const hy = cmd.y as number;
          const size = cmd.size as number;
          ctx.beginPath();
          ctx.moveTo(hx, hy + size / 4);
          ctx.bezierCurveTo(hx, hy, hx - size / 2, hy, hx - size / 2, hy + size / 4);
          ctx.bezierCurveTo(hx - size / 2, hy + size / 2, hx, hy + size * 0.75, hx, hy + size);
          ctx.bezierCurveTo(hx, hy + size * 0.75, hx + size / 2, hy + size / 2, hx + size / 2, hy + size / 4);
          ctx.bezierCurveTo(hx + size / 2, hy, hx, hy, hx, hy + size / 4);
          ctx.closePath();
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;
        }

        case 'text':
          currentFont = `${cmd.size}px ${currentFontFamily}`;
          ctx.font = currentFont;
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fillText(cmd.text as string, cmd.x as number, cmd.y as number);
          }
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.strokeText(cmd.text as string, cmd.x as number, cmd.y as number);
          }
          break;

        case 'textAlign':
          ctx.textAlign = cmd.horizontal as CanvasTextAlign;
          ctx.textBaseline = cmd.vertical as CanvasTextBaseline;
          break;

        case 'font':
          currentFontFamily = cmd.family as string;
          currentFont = `${cmd.style} ${currentFont.split(' ').pop()} ${cmd.family}`;
          ctx.font = currentFont;
          break;

        // ========== Gradients ==========
        case 'linearGradient': {
          const grad = ctx.createLinearGradient(
            cmd.x1 as number, cmd.y1 as number,
            cmd.x2 as number, cmd.y2 as number
          );
          const stops = cmd.stops as Array<[number, string]>;
          stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
          currentFill = grad as unknown as string;
          break;
        }

        case 'radialGradient': {
          const rgrad = ctx.createRadialGradient(
            cmd.x1 as number, cmd.y1 as number, cmd.r1 as number,
            cmd.x2 as number, cmd.y2 as number, cmd.r2 as number
          );
          const rstops = cmd.stops as Array<[number, string]>;
          rstops.forEach(([offset, color]) => rgrad.addColorStop(offset, color));
          currentFill = rgrad as unknown as string;
          break;
        }

        // ========== Transformations ==========
        case 'translate':
          ctx.translate(cmd.x as number, cmd.y as number);
          break;

        case 'rotate':
          ctx.rotate(cmd.angle as number);
          break;

        case 'scale':
          ctx.scale(cmd.x as number, cmd.y as number);
          break;

        case 'save':
          ctx.save();
          break;

        case 'restore':
          ctx.restore();
          break;

        case 'resetTransform':
          ctx.resetTransform();
          break;

        // ========== Path Drawing ==========
        case 'beginPath':
          ctx.beginPath();
          break;

        case 'closePath':
          ctx.closePath();
          break;

        case 'moveTo':
          ctx.moveTo(cmd.x as number, cmd.y as number);
          break;

        case 'lineTo':
          ctx.lineTo(cmd.x as number, cmd.y as number);
          break;

        case 'bezierTo':
          ctx.bezierCurveTo(
            cmd.cp1x as number, cmd.cp1y as number,
            cmd.cp2x as number, cmd.cp2y as number,
            cmd.x as number, cmd.y as number
          );
          break;

        case 'quadraticTo':
          ctx.quadraticCurveTo(
            cmd.cpx as number, cmd.cpy as number,
            cmd.x as number, cmd.y as number
          );
          break;

        case 'fillPath':
          if (hasFill && currentFill) {
            ctx.fillStyle = currentFill;
            ctx.fill();
          }
          break;

        case 'strokePath':
          if (hasStroke && currentStroke) {
            ctx.strokeStyle = currentStroke;
            ctx.lineWidth = currentWidth;
            ctx.stroke();
          }
          break;

        // ========== Sprites ==========
        case 'createSprite':
          // Just register, drawing happens with drawSprite
          break;

        case 'drawSprite': {
          const sprite = cmd.sprite as SpriteData;
          if (sprite && sprite.visible) {
            ctx.save();
            ctx.translate(sprite.x + sprite.width / 2, sprite.y + sprite.height / 2);
            ctx.rotate(sprite.rotation);
            ctx.scale(sprite.scale, sprite.scale);
            ctx.fillStyle = sprite.color;
            ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
            ctx.restore();
          }
          break;
        }
          
        // ========== Turtle Graphics ==========
        case 'turtle_reset':
          turtleRef.current = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            angle: -90,
            penDown: true,
            color: '#00ff88',
            width: 2,
          };
          break;
          
        case 'turtle_line':
          ctx.beginPath();
          ctx.moveTo(cmd.x1 as number, cmd.y1 as number);
          ctx.lineTo(cmd.x2 as number, cmd.y2 as number);
          ctx.strokeStyle = cmd.color as string;
          ctx.lineWidth = cmd.width as number;
          ctx.lineCap = 'round';
          ctx.stroke();
          break;
          
        case 'turtle_move':
          turtleRef.current.x = cmd.x as number;
          turtleRef.current.y = cmd.y as number;
          turtleRef.current.angle = cmd.angle as number;
          break;

        case 'turtle_dot': {
          ctx.beginPath();
          ctx.arc(cmd.x as number, cmd.y as number, cmd.size as number, 0, Math.PI * 2);
          ctx.fillStyle = cmd.color as string;
          ctx.fill();
          break;
        }

        case 'turtle_stamp': {
          // Draw a triangle pointing in turtle direction
          const tx = cmd.x as number;
          const ty = cmd.y as number;
          const ta = ((cmd.angle as number) * Math.PI) / 180;
          const tsize = 15;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(ta);
          ctx.beginPath();
          ctx.moveTo(tsize, 0);
          ctx.lineTo(-tsize / 2, -tsize / 2);
          ctx.lineTo(-tsize / 2, tsize / 2);
          ctx.closePath();
          ctx.fillStyle = cmd.color as string;
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
  }, [commands]);

  return (
    <div className="rounded-lg border border-border/50 glass overflow-hidden">
      <div className="px-4 py-2 bg-muted/30 border-b border-border/50 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground font-mono">{'>'} canvas_output</span>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-destructive/20 transition-colors"
            aria-label="Close canvas"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-4 overflow-auto bg-[#0d0d15]">
        <canvas
          ref={canvasRef}
          width={displayWidth}
          height={displayHeight}
          className="rounded-md shadow-lg block mx-auto"
          style={{ imageRendering: 'auto', width: displayWidth, height: displayHeight }}
        />
      </div>
    </div>
  );
});

CanvasPanel.displayName = 'CanvasPanel';