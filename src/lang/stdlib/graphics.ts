import { SdevError } from '../core/errors';
import { SdevFunction, stringify } from '../builtins/utils';
import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_GRAPHICS_SRC from '../../../lang/stdlib/v2/graphics.sdev?raw';
import SDEV_TURTLE_SRC from '../../../lang/stdlib/v2/turtle.sdev?raw';

const getGfxRunner = lazyModuleRunner(SDEV_GRAPHICS_SRC, SDEV_TURTLE_SRC);

export interface GraphicsCommand {
  type: string;
  [key: string]: unknown;
}

export type GraphicsCallback = (cmd: GraphicsCommand) => void;

export interface TurtleState {
  x: number;
  y: number;
  angle: number;
  penDown: boolean;
  color: string;
  width: number;
}

export interface SpriteData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  scale: number;
  visible: boolean;
  velocityX: number;
  velocityY: number;
  image?: string;
}

export function createGraphicsBuiltins(
  emit: GraphicsCallback,
  getTurtle: () => TurtleState,
  setTurtle: (state: Partial<TurtleState>) => void
): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();
  let spriteIdCounter = 0;
  const sprites: Map<number, SpriteData> = new Map();

  // ========== Canvas Setup ==========
  builtins.set('canvas', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('canvas() takes 2 arguments (width, height)', line);
      const w = args[0] as number;
      const h = args[1] as number;
      emit({ type: 'canvas', width: w, height: h });
      return null;
    },
  });

  builtins.set('clear', {
    type: 'builtin',
    call: (args: unknown[]) => {
      const color = args[0] as string ?? '#1a1a2e';
      emit({ type: 'clear', color });
      return null;
    },
  });

  builtins.set('background', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('background() takes at least 1 argument', line);
      emit({ type: 'background', color: stringify(args[0]) });
      return null;
    },
  });

  // ========== Drawing State ==========
  builtins.set('fill', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fill() takes 1 argument (color)', line);
      emit({ type: 'fill', color: stringify(args[0]) });
      return null;
    },
  });

  builtins.set('noFill', {
    type: 'builtin',
    call: () => {
      emit({ type: 'noFill' });
      return null;
    },
  });

  builtins.set('stroke', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) throw new SdevError('stroke() takes 1-2 arguments (color, width?)', line);
      emit({ type: 'stroke', color: stringify(args[0]), width: args[1] as number ?? 1 });
      return null;
    },
  });

  builtins.set('noStroke', {
    type: 'builtin',
    call: () => {
      emit({ type: 'noStroke' });
      return null;
    },
  });

  builtins.set('lineWidth', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('lineWidth() takes 1 argument', line);
      emit({ type: 'lineWidth', width: args[0] as number });
      return null;
    },
  });

  builtins.set('lineCap', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('lineCap() takes 1 argument (round, square, butt)', line);
      emit({ type: 'lineCap', cap: stringify(args[0]) });
      return null;
    },
  });

  builtins.set('lineJoin', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('lineJoin() takes 1 argument (round, bevel, miter)', line);
      emit({ type: 'lineJoin', join: stringify(args[0]) });
      return null;
    },
  });

  builtins.set('alpha', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('alpha() takes 1 argument (0-1)', line);
      emit({ type: 'alpha', value: args[0] as number });
      return null;
    },
  });

  builtins.set('shadow', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 3) throw new SdevError('shadow() takes 3-4 arguments (color, blur, offsetX, offsetY?)', line);
      emit({ 
        type: 'shadow', 
        color: stringify(args[0]), 
        blur: args[1] as number,
        offsetX: args[2] as number,
        offsetY: (args[3] as number) ?? args[2] as number
      });
      return null;
    },
  });

  builtins.set('noShadow', {
    type: 'builtin',
    call: () => {
      emit({ type: 'noShadow' });
      return null;
    },
  });

  // ========== Basic Shapes ==========
  builtins.set('rect', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 4) throw new SdevError('rect() takes 4-5 arguments (x, y, w, h, radius?)', line);
      emit({ type: 'rect', x: args[0], y: args[1], w: args[2], h: args[3], radius: args[4] ?? 0 });
      return null;
    },
  });

  builtins.set('circle', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('circle() takes 3 arguments (x, y, radius)', line);
      emit({ type: 'circle', x: args[0], y: args[1], r: args[2] });
      return null;
    },
  });

  builtins.set('ellipse', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 4) throw new SdevError('ellipse() takes 4-5 arguments (x, y, rx, ry, rotation?)', line);
      emit({ type: 'ellipse', x: args[0], y: args[1], rx: args[2], ry: args[3], rotation: args[4] ?? 0 });
      return null;
    },
  });

  builtins.set('arc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 5) throw new SdevError('arc() takes 5-6 arguments (x, y, radius, startAngle, endAngle, anticlockwise?)', line);
      emit({ 
        type: 'arc', 
        x: args[0], y: args[1], 
        r: args[2], 
        start: args[3], end: args[4],
        ccw: args[5] ?? false 
      });
      return null;
    },
  });

  builtins.set('line', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('line() takes 4 arguments (x1, y1, x2, y2)', line);
      emit({ type: 'line', x1: args[0], y1: args[1], x2: args[2], y2: args[3] });
      return null;
    },
  });

  builtins.set('point', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('point() takes 2-3 arguments (x, y, size?)', line);
      emit({ type: 'point', x: args[0], y: args[1], size: args[2] ?? 1 });
      return null;
    },
  });

  builtins.set('triangle', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 6) throw new SdevError('triangle() takes 6 arguments (x1, y1, x2, y2, x3, y3)', line);
      emit({ type: 'triangle', x1: args[0], y1: args[1], x2: args[2], y2: args[3], x3: args[4], y3: args[5] });
      return null;
    },
  });

  builtins.set('polygon', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('polygon() takes points [[x,y], ...]', line);
      const points = args[0];
      if (!Array.isArray(points)) throw new SdevError('polygon() argument must be a list of points', line);
      emit({ type: 'polygon', points });
      return null;
    },
  });

  builtins.set('star', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 4) throw new SdevError('star() takes 4-5 arguments (x, y, outerRadius, innerRadius, points?)', line);
      emit({ 
        type: 'star', 
        x: args[0], y: args[1], 
        outer: args[2], inner: args[3], 
        points: args[4] ?? 5 
      });
      return null;
    },
  });

  builtins.set('heart', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('heart() takes 3 arguments (x, y, size)', line);
      emit({ type: 'heart', x: args[0], y: args[1], size: args[2] });
      return null;
    },
  });

  builtins.set('text', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 3) throw new SdevError('text() takes 3-4 arguments (str, x, y, size?)', line);
      emit({ type: 'text', text: stringify(args[0]), x: args[1], y: args[2], size: args[3] ?? 16 });
      return null;
    },
  });

  builtins.set('textAlign', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('textAlign() takes 1-2 arguments (horizontal, vertical?)', line);
      emit({ type: 'textAlign', horizontal: stringify(args[0]), vertical: args[1] ? stringify(args[1]) : 'alphabetic' });
      return null;
    },
  });

  builtins.set('font', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('font() takes 1-2 arguments (fontFamily, style?)', line);
      emit({ type: 'font', family: stringify(args[0]), style: args[1] ? stringify(args[1]) : 'normal' });
      return null;
    },
  });

  // ========== Gradients ==========
  builtins.set('linearGradient', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 5) throw new SdevError('linearGradient() takes 5+ arguments (x1, y1, x2, y2, ...colorStops)', line);
      const stops = args.slice(4) as Array<[number, string]>;
      emit({ type: 'linearGradient', x1: args[0], y1: args[1], x2: args[2], y2: args[3], stops });
      return null;
    },
  });

  builtins.set('radialGradient', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 7) throw new SdevError('radialGradient() takes 7+ arguments (x1, y1, r1, x2, y2, r2, ...colorStops)', line);
      const stops = args.slice(6) as Array<[number, string]>;
      emit({ type: 'radialGradient', x1: args[0], y1: args[1], r1: args[2], x2: args[3], y2: args[4], r2: args[5], stops });
      return null;
    },
  });

  // ========== Transformations ==========
  builtins.set('translate', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('translate() takes 2 arguments (x, y)', line);
      emit({ type: 'translate', x: args[0], y: args[1] });
      return null;
    },
  });

  builtins.set('rotate', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('rotate() takes 1 argument (angle in radians)', line);
      emit({ type: 'rotate', angle: args[0] });
      return null;
    },
  });

  builtins.set('scale', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('scale() takes 1-2 arguments (x, y?)', line);
      emit({ type: 'scale', x: args[0], y: args[1] ?? args[0] });
      return null;
    },
  });

  builtins.set('save', {
    type: 'builtin',
    call: () => {
      emit({ type: 'save' });
      return null;
    },
  });

  builtins.set('restore', {
    type: 'builtin',
    call: () => {
      emit({ type: 'restore' });
      return null;
    },
  });

  builtins.set('resetTransform', {
    type: 'builtin',
    call: () => {
      emit({ type: 'resetTransform' });
      return null;
    },
  });

  // ========== Path Drawing ==========
  builtins.set('beginPath', {
    type: 'builtin',
    call: () => {
      emit({ type: 'beginPath' });
      return null;
    },
  });

  builtins.set('closePath', {
    type: 'builtin',
    call: () => {
      emit({ type: 'closePath' });
      return null;
    },
  });

  builtins.set('moveTo', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('moveTo() takes 2 arguments (x, y)', line);
      emit({ type: 'moveTo', x: args[0], y: args[1] });
      return null;
    },
  });

  builtins.set('lineTo', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('lineTo() takes 2 arguments (x, y)', line);
      emit({ type: 'lineTo', x: args[0], y: args[1] });
      return null;
    },
  });

  builtins.set('bezierTo', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 6) throw new SdevError('bezierTo() takes 6 arguments (cp1x, cp1y, cp2x, cp2y, x, y)', line);
      emit({ type: 'bezierTo', cp1x: args[0], cp1y: args[1], cp2x: args[2], cp2y: args[3], x: args[4], y: args[5] });
      return null;
    },
  });

  builtins.set('quadraticTo', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('quadraticTo() takes 4 arguments (cpx, cpy, x, y)', line);
      emit({ type: 'quadraticTo', cpx: args[0], cpy: args[1], x: args[2], y: args[3] });
      return null;
    },
  });

  builtins.set('fillPath', {
    type: 'builtin',
    call: () => {
      emit({ type: 'fillPath' });
      return null;
    },
  });

  builtins.set('strokePath', {
    type: 'builtin',
    call: () => {
      emit({ type: 'strokePath' });
      return null;
    },
  });

  // ========== Sprite System ==========
  builtins.set('createSprite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 4) throw new SdevError('createSprite() takes 4-5 arguments (x, y, width, height, color?)', line);
      const id = spriteIdCounter++;
      const sprite: SpriteData = {
        id,
        x: args[0] as number,
        y: args[1] as number,
        width: args[2] as number,
        height: args[3] as number,
        color: args[4] ? stringify(args[4]) : '#ffffff',
        rotation: 0,
        scale: 1,
        visible: true,
        velocityX: 0,
        velocityY: 0
      };
      sprites.set(id, sprite);
      emit({ type: 'createSprite', sprite });
      return sprite;
    },
  });

  builtins.set('drawSprite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('drawSprite() takes 1 argument (sprite)', line);
      const sprite = args[0] as SpriteData;
      if (!sprite || typeof sprite.id !== 'number') throw new SdevError('Invalid sprite', line);
      emit({ type: 'drawSprite', sprite });
      return null;
    },
  });

  builtins.set('moveSprite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('moveSprite() takes 3 arguments (sprite, dx, dy)', line);
      const sprite = args[0] as SpriteData;
      if (!sprite || typeof sprite.id !== 'number') throw new SdevError('Invalid sprite', line);
      sprite.x += args[1] as number;
      sprite.y += args[2] as number;
      return sprite;
    },
  });

  builtins.set('updateSprite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('updateSprite() takes 1 argument (sprite)', line);
      const sprite = args[0] as SpriteData;
      if (!sprite || typeof sprite.id !== 'number') throw new SdevError('Invalid sprite', line);
      sprite.x += sprite.velocityX;
      sprite.y += sprite.velocityY;
      return sprite;
    },
  });

  builtins.set('spriteCollides', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('spriteCollides() takes 2 arguments (sprite1, sprite2)', line);
      const a = args[0] as SpriteData;
      const b = args[1] as SpriteData;
      if (!a || !b) throw new SdevError('Invalid sprites', line);
      return Boolean(getGfxRunner().call('gfx_sprite_collides', a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height));
    },
  });

  // ========== Turtle Graphics ==========
  builtins.set('turtle', {
    type: 'builtin',
    call: () => {
      setTurtle({ x: 200, y: 200, angle: -90, penDown: true, color: '#00ff88', width: 2 });
      emit({ type: 'turtle_reset' });
      return null;
    },
  });

  builtins.set('forward', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('forward() takes 1 argument (distance)', line);
      const t = getTurtle();
      const [newX, newY] = getGfxRunner().call('turtle_step_pos', t.x, t.y, t.angle, args[0] as number) as [number, number];
      if (t.penDown) {
        emit({ type: 'turtle_line', x1: t.x, y1: t.y, x2: newX, y2: newY, color: t.color, width: t.width });
      }
      setTurtle({ x: newX, y: newY });
      emit({ type: 'turtle_move', x: newX, y: newY, angle: t.angle });
      return null;
    },
  });

  builtins.set('backward', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('backward() takes 1 argument (distance)', line);
      const dist = -(args[0] as number);
      const t = getTurtle();
      const [newX, newY] = getGfxRunner().call('turtle_step_pos', t.x, t.y, t.angle, dist) as [number, number];
      if (t.penDown) {
        emit({ type: 'turtle_line', x1: t.x, y1: t.y, x2: newX, y2: newY, color: t.color, width: t.width });
      }
      setTurtle({ x: newX, y: newY });
      emit({ type: 'turtle_move', x: newX, y: newY, angle: t.angle });
      return null;
    },
  });

  builtins.set('left', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('left() takes 1 argument (degrees)', line);
      const t = getTurtle();
      const newAngle = t.angle - (args[0] as number);
      setTurtle({ angle: newAngle });
      emit({ type: 'turtle_move', x: t.x, y: t.y, angle: newAngle });
      return null;
    },
  });

  builtins.set('right', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('right() takes 1 argument (degrees)', line);
      const t = getTurtle();
      const newAngle = t.angle + (args[0] as number);
      setTurtle({ angle: newAngle });
      emit({ type: 'turtle_move', x: t.x, y: t.y, angle: newAngle });
      return null;
    },
  });

  builtins.set('penup', {
    type: 'builtin',
    call: () => {
      setTurtle({ penDown: false });
      return null;
    },
  });

  builtins.set('pendown', {
    type: 'builtin',
    call: () => {
      setTurtle({ penDown: true });
      return null;
    },
  });

  builtins.set('pencolor', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('pencolor() takes 1 argument (color)', line);
      setTurtle({ color: stringify(args[0]) });
      return null;
    },
  });

  builtins.set('penwidth', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('penwidth() takes 1 argument (width)', line);
      setTurtle({ width: args[0] as number });
      return null;
    },
  });

  builtins.set('goto', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('goto() takes 2 arguments (x, y)', line);
      const t = getTurtle();
      const newX = args[0] as number;
      const newY = args[1] as number;
      if (t.penDown) {
        emit({ type: 'turtle_line', x1: t.x, y1: t.y, x2: newX, y2: newY, color: t.color, width: t.width });
      }
      setTurtle({ x: newX, y: newY });
      emit({ type: 'turtle_move', x: newX, y: newY, angle: t.angle });
      return null;
    },
  });

  builtins.set('home', {
    type: 'builtin',
    call: () => {
      const t = getTurtle();
      if (t.penDown) {
        emit({ type: 'turtle_line', x1: t.x, y1: t.y, x2: 200, y2: 200, color: t.color, width: t.width });
      }
      setTurtle({ x: 200, y: 200, angle: -90 });
      emit({ type: 'turtle_move', x: 200, y: 200, angle: -90 });
      return null;
    },
  });

  builtins.set('setheading', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('setheading() takes 1 argument (angle)', line);
      const t = getTurtle();
      const angle = (args[0] as number) - 90; // Adjust so 0 is up
      setTurtle({ angle });
      emit({ type: 'turtle_move', x: t.x, y: t.y, angle });
      return null;
    },
  });

  builtins.set('heading', {
    type: 'builtin',
    call: () => {
      const t = getTurtle();
      return (t.angle + 90) % 360;
    },
  });

  builtins.set('pos', {
    type: 'builtin',
    call: () => {
      const t = getTurtle();
      return [t.x, t.y];
    },
  });

  builtins.set('turtleCircle', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('turtleCircle() takes 1-2 arguments (radius, steps?)', line);
      const radius = args[0] as number;
      const steps = (args[1] as number) ?? 36;
      const t = getTurtle();
      const [endX, endY, endAngle, segs] = getGfxRunner().call(
        'turtle_circle_steps', t.x, t.y, t.angle, radius, steps
      ) as [number, number, number, Array<[number, number, number, number]>];
      if (t.penDown) {
        for (const [x1, y1, x2, y2] of segs) {
          emit({ type: 'turtle_line', x1, y1, x2, y2, color: t.color, width: t.width });
        }
      }
      setTurtle({ x: endX, y: endY, angle: endAngle });
      emit({ type: 'turtle_move', x: endX, y: endY, angle: endAngle });
      return null;
    },
  });

  builtins.set('dot', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const size = (args[0] as number) ?? 5;
      const color = args[1] ? stringify(args[1]) : getTurtle().color;
      const t = getTurtle();
      emit({ type: 'turtle_dot', x: t.x, y: t.y, size, color });
      return null;
    },
  });

  builtins.set('stamp', {
    type: 'builtin',
    call: () => {
      const t = getTurtle();
      emit({ type: 'turtle_stamp', x: t.x, y: t.y, angle: t.angle, color: t.color });
      return null;
    },
  });

  // ========== Color Helpers ==========
  builtins.set('hue', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 3) throw new SdevError('hue() takes 1-3 arguments (h, s?, l?)', line);
      return getGfxRunner().callStr('gfx_hue_css', args[0] as number, (args[1] as number) ?? 100, (args[2] as number) ?? 50);
    },
  });

  builtins.set('rgb', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('rgb() takes 3 arguments (r, g, b)', line);
      return getGfxRunner().callStr('gfx_rgb_css', args[0], args[1], args[2]);
    },
  });

  builtins.set('rgba', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('rgba() takes 4 arguments (r, g, b, a)', line);
      return getGfxRunner().callStr('gfx_rgba_css', args[0], args[1], args[2], args[3]);
    },
  });

  builtins.set('hsla', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('hsla() takes 4 arguments (h, s, l, a)', line);
      return getGfxRunner().callStr('gfx_hsla_css', args[0], args[1], args[2], args[3]);
    },
  });

  builtins.set('randomColor', {
    type: 'builtin',
    call: () => {
      const h = Math.floor(Math.random() * 360);
      return getGfxRunner().callStr('gfx_hue_css', h, 70, 60);
    },
  });

  // ========== Math Utilities for Graphics ==========
  builtins.set('radians', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('radians() takes 1 argument (degrees)', line);
      return getGfxRunner().call('gfx_radians', args[0] as number);
    },
  });

  builtins.set('degrees', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('degrees() takes 1 argument (radians)', line);
      return getGfxRunner().call('gfx_degrees', args[0] as number);
    },
  });

  builtins.set('lerp', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('lerp() takes 3 arguments (a, b, t)', line);
      return getGfxRunner().call('gfx_lerp', args[0], args[1], args[2]);
    },
  });

  builtins.set('mapRange', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 5) throw new SdevError('mapRange() takes 5 arguments (value, inMin, inMax, outMin, outMax)', line);
      return getGfxRunner().call('gfx_map_range', args[0], args[1], args[2], args[3], args[4]);
    },
  });

  builtins.set('constrain', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('constrain() takes 3 arguments (value, min, max)', line);
      return getGfxRunner().call('gfx_constrain', args[0], args[1], args[2]);
    },
  });

  builtins.set('dist', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 4) throw new SdevError('dist() takes 4 arguments (x1, y1, x2, y2)', line);
      return getGfxRunner().call('gfx_dist', args[0], args[1], args[2], args[3]);
    },
  });

  return builtins;
}
