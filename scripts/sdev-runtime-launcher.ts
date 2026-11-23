import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { Lexer } from '../src/lang/core/lexer';
import { Parser } from '../src/lang/core/parser';
import { Interpreter } from '../src/lang/runtime/interpreter';
import { createGraphicsBuiltins, type GraphicsCommand, type TurtleState } from '../src/lang/stdlib/graphics';
import { createUiBuiltins, type UiCallback, type UiState } from '../src/lang/stdlib/ui';
import { createWebBuiltins, renderWebDocument, type WebState } from '../src/lang/stdlib/web';

const MAGIC = Buffer.from('SDEVPACK', 'ascii');

type Callable = { type: 'builtin' | 'user' | 'lambda'; call: (args: unknown[], line: number) => unknown };

function readAppendedPayload(): string | null {
  const exe = process.execPath;
  const size = fs.statSync(exe).size;
  if (size < 16) return null;
  const fd = fs.openSync(exe, 'r');
  try {
    const scanSize = Math.min(65536, size);
    const tail = Buffer.alloc(scanSize);
    fs.readSync(fd, tail, 0, scanSize, size - scanSize);
    let idx = -1;
    for (let i = tail.length - 16; i >= 0; i--) {
      if (tail[i] === 83 && tail.subarray(i, i + 8).equals(MAGIC)) { idx = i; break; }
    }
    if (idx < 0) return null;
    const payloadLen = Number(tail.readBigUInt64LE(idx + 8));
    if (!Number.isFinite(payloadLen) || payloadLen <= 0) return null;
    const absoluteMagicOffset = size - scanSize + idx;
    const payloadStart = absoluteMagicOffset - payloadLen;
    if (payloadStart < 0) return null;
    const payload = Buffer.alloc(payloadLen);
    fs.readSync(fd, payload, 0, payloadLen, payloadStart);
    return payload.toString('utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

function escPs(s: string): string {
  return s.replace(/'/g, "''");
}

function writeTemp(name: string, content: string): string {
  const dir = path.join(os.tmpdir(), `sdev-app-${process.pid}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function openInDefaultBrowser(file: string) {
  if (process.platform === 'win32') {
    try { execFileSync('cmd', ['/c', 'start', '""', file], { stdio: 'ignore', windowsHide: true }); } catch { /* ignore */ }
  } else {
    try { spawn('xdg-open', [file], { detached: true, stdio: 'ignore' }).unref(); } catch { /* ignore */ }
  }
}

function spawnPowerShell(script: string, wait = false) {
  const ps1 = writeTemp(`window-${Date.now()}.ps1`, script);
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', ps1], {
    detached: !wait,
    stdio: 'ignore',
    windowsHide: true,
  });
  if (!wait) child.unref();
  return child;
}

function canvasInfo(commands: GraphicsCommand[]) {
  const cmd = [...commands].reverse().find((c) => c.type === 'canvas');
  const width = Math.max(1, Math.min(4096, Number(cmd?.width ?? 400) || 400));
  const height = Math.max(1, Math.min(4096, Number(cmd?.height ?? 400) || 400));
  return { width, height };
}

function canvasPowershell(commandsPath: string, title: string, width: number, height: number) {
  return `Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$commands = Get-Content -LiteralPath '${escPs(commandsPath)}' -Raw | ConvertFrom-Json
function Brush($c) { if ([string]::IsNullOrWhiteSpace([string]$c)) { return [Windows.Media.Brushes]::Transparent }; try { return [Windows.Media.BrushConverter]::new().ConvertFromString([string]$c) } catch { return [Windows.Media.Brushes]::Black } }
function Add-Shape($shape, $x, $y) { [Windows.Controls.Canvas]::SetLeft($shape, [double]$x); [Windows.Controls.Canvas]::SetTop($shape, [double]$y); [void]$cv.Children.Add($shape) }
$win = [Windows.Window]::new()
$win.Title = '${escPs(title)}'
$win.SizeToContent = 'WidthAndHeight'
$win.ResizeMode = 'NoResize'
$win.WindowStartupLocation = 'CenterScreen'
$cv = [Windows.Controls.Canvas]::new()
$cv.Width = ${width}
$cv.Height = ${height}
$cv.Background = Brush '#1a1a2e'
$fill = '#00ff88'; $stroke = '#00ff88'; $lw = 2.0; $hasFill = $true; $hasStroke = $true
foreach ($cmd in $commands) {
  switch ([string]$cmd.type) {
    'canvas' { $cv.Width=[double]$cmd.width; $cv.Height=[double]$cmd.height }
    'clear' { $cv.Children.Clear(); $cv.Background = Brush $cmd.color }
    'background' { $cv.Children.Clear(); $cv.Background = Brush $cmd.color }
    'fill' { $fill=[string]$cmd.color; $hasFill=$true }
    'noFill' { $hasFill=$false }
    'stroke' { $stroke=[string]$cmd.color; if ($cmd.width -ne $null) { $lw=[double]$cmd.width }; $hasStroke=$true }
    'noStroke' { $hasStroke=$false }
    'lineWidth' { $lw=[double]$cmd.width }
    'rect' { $s=[Windows.Shapes.Rectangle]::new(); $s.Width=[double]$cmd.w; $s.Height=[double]$cmd.h; if ($cmd.radius -ne $null) { $s.RadiusX=[double]$cmd.radius; $s.RadiusY=[double]$cmd.radius }; if ($hasFill) { $s.Fill=Brush $fill }; if ($hasStroke) { $s.Stroke=Brush $stroke; $s.StrokeThickness=$lw }; Add-Shape $s $cmd.x $cmd.y }
    'circle' { $s=[Windows.Shapes.Ellipse]::new(); $r=[double]$cmd.r; $s.Width=$r*2; $s.Height=$r*2; if ($hasFill) { $s.Fill=Brush $fill }; if ($hasStroke) { $s.Stroke=Brush $stroke; $s.StrokeThickness=$lw }; Add-Shape $s ([double]$cmd.x-$r) ([double]$cmd.y-$r) }
    'ellipse' { $s=[Windows.Shapes.Ellipse]::new(); $rx=[double]$cmd.rx; $ry=[double]$cmd.ry; $s.Width=$rx*2; $s.Height=$ry*2; if ($hasFill) { $s.Fill=Brush $fill }; if ($hasStroke) { $s.Stroke=Brush $stroke; $s.StrokeThickness=$lw }; Add-Shape $s ([double]$cmd.x-$rx) ([double]$cmd.y-$ry) }
    'line' { $s=[Windows.Shapes.Line]::new(); $s.X1=[double]$cmd.x1; $s.Y1=[double]$cmd.y1; $s.X2=[double]$cmd.x2; $s.Y2=[double]$cmd.y2; $s.Stroke=Brush $stroke; $s.StrokeThickness=$lw; [void]$cv.Children.Add($s) }
    'turtle_line' { $s=[Windows.Shapes.Line]::new(); $s.X1=[double]$cmd.x1; $s.Y1=[double]$cmd.y1; $s.X2=[double]$cmd.x2; $s.Y2=[double]$cmd.y2; $s.Stroke=Brush $cmd.color; $s.StrokeThickness=[double]$cmd.width; $s.StrokeStartLineCap='Round'; $s.StrokeEndLineCap='Round'; [void]$cv.Children.Add($s) }
    'point' { $s=[Windows.Shapes.Ellipse]::new(); $size = if ($null -ne $cmd.size) { [double]$cmd.size } else { 1.0 }; $r=$size/2; $s.Width=$r*2; $s.Height=$r*2; $s.Fill=Brush $fill; Add-Shape $s ([double]$cmd.x-$r) ([double]$cmd.y-$r) }
    'turtle_dot' { $s=[Windows.Shapes.Ellipse]::new(); $r=[double]$cmd.size; $s.Width=$r*2; $s.Height=$r*2; $s.Fill=Brush $cmd.color; Add-Shape $s ([double]$cmd.x-$r) ([double]$cmd.y-$r) }
    'triangle' { $p=[Windows.Shapes.Polygon]::new(); $p.Points=[Windows.Media.PointCollection]::Parse("$($cmd.x1),$($cmd.y1) $($cmd.x2),$($cmd.y2) $($cmd.x3),$($cmd.y3)"); if ($hasFill) { $p.Fill=Brush $fill }; if ($hasStroke) { $p.Stroke=Brush $stroke; $p.StrokeThickness=$lw }; [void]$cv.Children.Add($p) }
    'polygon' { $pts = @(); foreach ($pt in $cmd.points) { $pts += "$($pt[0]),$($pt[1])" }; $p=[Windows.Shapes.Polygon]::new(); $p.Points=[Windows.Media.PointCollection]::Parse(($pts -join ' ')); if ($hasFill) { $p.Fill=Brush $fill }; if ($hasStroke) { $p.Stroke=Brush $stroke; $p.StrokeThickness=$lw }; [void]$cv.Children.Add($p) }
    'star' { $pts=@(); $n=if ($null -ne $cmd.points) { [int]$cmd.points } else { 5 }; for ($i=0; $i -lt $n*2; $i++) { $rr = if ($i % 2 -eq 0) { [double]$cmd.outer } else { [double]$cmd.inner }; $a=($i*[Math]::PI)/$n-[Math]::PI/2; $pts += "$([double]$cmd.x+$rr*[Math]::Cos($a)),$([double]$cmd.y+$rr*[Math]::Sin($a))" }; $p=[Windows.Shapes.Polygon]::new(); $p.Points=[Windows.Media.PointCollection]::Parse(($pts -join ' ')); if ($hasFill) { $p.Fill=Brush $fill }; if ($hasStroke) { $p.Stroke=Brush $stroke; $p.StrokeThickness=$lw }; [void]$cv.Children.Add($p) }
    'text' { $t=[Windows.Controls.TextBlock]::new(); $t.Text=[string]$cmd.text; $t.FontSize=[double]$cmd.size; $t.Foreground=Brush $fill; Add-Shape $t $cmd.x $cmd.y }
  }
}
$win.Content = $cv
[void]$win.ShowDialog()`;
}

function showNativeCanvas(commands: GraphicsCommand[], title = 'SDEV Canvas') {
  const { width, height } = canvasInfo(commands);
  const json = writeTemp('canvas.json', JSON.stringify(commands));
  spawnPowerShell(canvasPowershell(json, title, width, height));
}

function serializeUi(s: UiState | null) {
  if (!s) return null;
  return {
    rootId: s.rootId,
    nodes: Object.fromEntries([...s.nodes].map(([k, v]) => [k, { id: v.id, type: v.type, props: v.props, children: v.children, handlers: v.handlers }])),
    values: Object.fromEntries(s.values),
  };
}

function uiPowershell(port: number, title: string, width: number, height: number) {
  return `Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$base = 'http://127.0.0.1:${port}'
function Fetch-State { try { return Invoke-RestMethod -Uri ($base + '/state') -UseBasicParsing } catch { return $null } }
function Get-Prop($obj, $key) { if (!$obj -or !$key) { return $null }; $p = $obj.PSObject.Properties[[string]$key]; if ($p) { return $p.Value }; return $null }
function Get-Node($nodes, $id) { return Get-Prop $nodes ([string]$id) }
function Get-Val($st, $key, $fallback) { if (!$key) { return $fallback }; $v = Get-Prop $st.values $key; if ($null -eq $v) { return $fallback }; return $v }
function Prop-Or($obj, $name, $fallback) { try { $v = $obj.$name; if ($null -eq $v) { return $fallback }; return $v } catch { return $fallback } }
function Text-For($p, $st) { if ($p.bind) { return [string](Get-Val $st ([string]$p.bind) '') }; if ($null -eq $p.text) { return '' }; return [string]$p.text }
function Add-Kids($panel, $ids, $st) { foreach ($id in $ids) { $child = Render-Node (Get-Node $st.nodes $id) $st; if ($child) { [void]$panel.Children.Add($child) } } }
function Render-Node($n, $st) {
  if ($null -eq $n) { return $null }; $p = $n.props
  switch ([string]$n.type) {
    'row' { $w=[Windows.Controls.WrapPanel]::new(); $w.Margin='0,4,0,4'; Add-Kids $w $n.children $st; return $w }
    'column' { $sp=[Windows.Controls.StackPanel]::new(); $sp.Margin='0,4,0,4'; Add-Kids $sp $n.children $st; return $sp }
    'group' { $gb=[Windows.Controls.GroupBox]::new(); $gb.Header=[string]$p.title; $gb.Margin='0,6,0,6'; $inner=[Windows.Controls.StackPanel]::new(); Add-Kids $inner $n.children $st; $gb.Content=$inner; return $gb }
    'heading' { $tb=[Windows.Controls.TextBlock]::new(); $tb.Text=Text-For $p $st; $tb.FontWeight='SemiBold'; $level=[int](Prop-Or $p 'level' 1); $tb.FontSize=(26 - ($level*3)); $tb.Margin='0,4,0,6'; return $tb }
    'label' { $tb=[Windows.Controls.TextBlock]::new(); $tb.Text=Text-For $p $st; $tb.Margin='0,2,0,2'; return $tb }
    'paragraph' { $tb=[Windows.Controls.TextBlock]::new(); $tb.Text=Text-For $p $st; $tb.TextWrapping='Wrap'; $tb.Foreground='#555555'; $tb.Margin='0,4,0,4'; return $tb }
    'divider' { $r=[Windows.Controls.Separator]::new(); $r.Margin='0,8,0,8'; return $r }
    'spacer' { $b=[Windows.Controls.Border]::new(); $b.Height=[double](Prop-Or $p 'size' 8); return $b }
    'button' { $b=[Windows.Controls.Button]::new(); $b.Content=[string](Prop-Or $p 'label' 'Button'); $b.Margin='0,4,6,4'; $b.Padding='12,5,12,5'; $hid=$n.handlers.click; if ($hid -ne $null) { $b.Add_Click({ try { Invoke-RestMethod -Uri ($base + '/click?id=' + $hid) -Method Post -UseBasicParsing | Out-Null; Render-Root } catch {} }) }; return $b }
    'input' { $x=[Windows.Controls.TextBox]::new(); $bind=[string]$p.bind; $x.Text=[string](Get-Val $st $bind ''); $x.Margin='0,4,0,4'; $x.Add_LostFocus({ if ($bind) { try { Invoke-RestMethod -Uri ($base + '/set?k=' + [uri]::EscapeDataString($bind) + '&v=' + [uri]::EscapeDataString($this.Text)) -Method Post -UseBasicParsing | Out-Null } catch {} } }); return $x }
    'textarea' { $x=[Windows.Controls.TextBox]::new(); $bind=[string]$p.bind; $x.Text=[string](Get-Val $st $bind ''); $x.AcceptsReturn=$true; $x.Height=90; $x.TextWrapping='Wrap'; $x.Margin='0,4,0,4'; $x.Add_LostFocus({ if ($bind) { try { Invoke-RestMethod -Uri ($base + '/set?k=' + [uri]::EscapeDataString($bind) + '&v=' + [uri]::EscapeDataString($this.Text)) -Method Post -UseBasicParsing | Out-Null } catch {} } }); return $x }
    'checkbox' { $c=[Windows.Controls.CheckBox]::new(); $c.Content=[string]$p.label; $bind=[string]$p.bind; $c.IsChecked=[bool](Get-Val $st $bind $false); $c.Margin='0,4,0,4'; $c.Add_Click({ if ($bind) { try { Invoke-RestMethod -Uri ($base + '/set?k=' + [uri]::EscapeDataString($bind) + '&v=' + [uri]::EscapeDataString([string]$this.IsChecked)) -Method Post -UseBasicParsing | Out-Null } catch {} } }); return $c }
    'slider' { $s=[Windows.Controls.Slider]::new(); $s.Minimum=[double](Prop-Or $p 'min' 0); $s.Maximum=[double](Prop-Or $p 'max' 100); $bind=[string]$p.bind; $s.Value=[double](Get-Val $st $bind $s.Minimum); $s.Margin='0,6,0,6'; $s.Add_LostMouseCapture({ if ($bind) { try { Invoke-RestMethod -Uri ($base + '/set?k=' + [uri]::EscapeDataString($bind) + '&v=' + [uri]::EscapeDataString([string]$this.Value)) -Method Post -UseBasicParsing | Out-Null } catch {} } }); return $s }
    'select' { $cb=[Windows.Controls.ComboBox]::new(); foreach ($o in $p.options) { [void]$cb.Items.Add([string]$o) }; $bind=[string]$p.bind; $cb.SelectedItem=[string](Get-Val $st $bind ''); $cb.Margin='0,4,0,4'; $cb.Add_SelectionChanged({ if ($bind -and $this.SelectedItem) { try { Invoke-RestMethod -Uri ($base + '/set?k=' + [uri]::EscapeDataString($bind) + '&v=' + [uri]::EscapeDataString([string]$this.SelectedItem)) -Method Post -UseBasicParsing | Out-Null } catch {} } }); return $cb }
    'progress' { $pr=[Windows.Controls.ProgressBar]::new(); $pr.Minimum=0; $pr.Maximum=[double](Prop-Or $p 'max' 100); $raw = if ($p.bind) { Get-Val $st ([string]$p.bind) 0 } else { $p.value }; if ($null -eq $raw) { $raw = 0 }; $pr.Value=[double]$raw; $pr.Height=12; $pr.Margin='0,5,0,5'; return $pr }
    default { return $null }
  }
}
function Render-Root { $st=Fetch-State; if (!$st -or !$st.ui) { return }; $root=Get-Node $st.ui.nodes $st.ui.rootId; $body.Children.Clear(); Add-Kids $body $root.children $st.ui }
$win = [Windows.Window]::new(); $win.Title='${escPs(title)}'; $win.Width=${width}; $win.Height=${height}; $win.MinWidth=260; $win.MinHeight=180; $win.WindowStartupLocation='CenterScreen'
$scroll=[Windows.Controls.ScrollViewer]::new(); $scroll.VerticalScrollBarVisibility='Auto'; $body=[Windows.Controls.StackPanel]::new(); $body.Margin='14'; $scroll.Content=$body; $win.Content=$scroll
Render-Root
[void]$win.ShowDialog()`;
}

function showOutputWindow(lines: string[], title = 'SDEV Output') {
  const text = lines.join('\n') || 'Program finished.';
  const script = `Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$w=[Windows.Window]::new(); $w.Title='${escPs(title)}'; $w.Width=760; $w.Height=460; $w.WindowStartupLocation='CenterScreen'
$box=[Windows.Controls.TextBox]::new(); $box.Text='${escPs(text)}'; $box.FontFamily='Consolas'; $box.FontSize=13; $box.IsReadOnly=$true; $box.AcceptsReturn=$true; $box.TextWrapping='NoWrap'; $box.VerticalScrollBarVisibility='Auto'; $box.HorizontalScrollBarVisibility='Auto'; $w.Content=$box; [void]$w.ShowDialog()`;
  spawnPowerShell(script);
}

function runSdev(source: string) {
  const output: string[] = [];
  const commands: GraphicsCommand[] = [];
  let turtleState: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#00ff88', width: 2 };
  let uiState: UiState | null = null;
  let webState: WebState | null = null;
  const uiHandlers = new Map<number, UiCallback>();
  let uiHandlerId = 0;

  const lexer = new Lexer(source, { sourceLanguage: 'English', translate: false });
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();
  const interpreter = new Interpreter((msg) => output.push(msg));
  const env = interpreter.getGlobalEnv();

  createGraphicsBuiltins(
    (cmd) => commands.push(cmd),
    () => turtleState,
    (state) => { turtleState = { ...turtleState, ...state }; },
  ).forEach((fn, name) => env.define(name, fn));

  const runtimeInput = env.get('input', 0) as Callable;
  const ui = createUiBuiltins(
    (s) => { uiState = s; },
    (cb) => { const id = ++uiHandlerId; uiHandlers.set(id, cb); return id; },
  );
  const uiInput = ui.get('input');
  ui.forEach((fn, name) => { if (name !== 'input') env.define(name, fn); });
  if (uiInput) {
    env.define('input', {
      type: 'builtin',
      call: (args: unknown[], line: number) => {
        if (uiState?.rootId != null && args.length <= 2) return uiInput.call(args, line);
        return runtimeInput.call(args, line);
      },
    });
  }

  createWebBuiltins((s) => { webState = { ...s, head: [...s.head], stack: s.stack.map((b) => [...b]), css: [...s.css], js: [...s.js] }; })
    .forEach((fn, name) => {
      // Keep graphics canvas() authoritative. The web toolkit also exposes an
      // HTML <canvas> helper named canvas(), and if it overwrites the graphics
      // builtin then graphical programs produce a blank browser page instead of
      // native drawing commands.
      if (name !== 'canvas') env.define(name, fn);
    });

  interpreter.interpret(ast);
  return { output, commands, uiState, webState, uiHandlers };
}

async function main() {
  let source = readAppendedPayload();
  if (!source && process.argv[2]) source = fs.readFileSync(process.argv[2], 'utf8');
  if (!source) {
    showOutputWindow(['No SDEV program was embedded in this executable.']);
    return;
  }

  try {
    const runtime = runSdev(source);
    const root = runtime.uiState?.rootId ? runtime.uiState.nodes.get(runtime.uiState.rootId) : null;
    const rootProps = (root?.props ?? {}) as { title?: string; width?: number; height?: number };
    const title = String(rootProps.title ?? (runtime.commands.length ? 'SDEV Canvas' : 'SDEV Application'));

    if (runtime.webState?.produced && runtime.commands.length === 0) {
      const html = writeTemp('index.html', renderWebDocument(runtime.webState));
      openInDefaultBrowser(html);
    }

    // Always show canvas as its own standalone window when canvas commands exist.
    if (runtime.commands.length > 0) {
      showNativeCanvas(runtime.commands, 'SDEV Canvas');
    }

    if (root && runtime.uiState) {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (url.pathname === '/state') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ui: serializeUi(runtime.uiState), canvasLen: runtime.commands.length }));
          return;
        }
        if (url.pathname === '/click') {
          const id = Number(url.searchParams.get('id'));
          const cb = runtime.uiHandlers.get(id);
          try { cb?.fn([]); } catch (e) { runtime.output.push(String(e)); }
          res.end('ok');
          return;
        }
        if (url.pathname === '/set') {
          const k = url.searchParams.get('k') ?? '';
          const v = url.searchParams.get('v') ?? '';
          if (k && runtime.uiState) runtime.uiState.values.set(k, v);
          res.end('ok');
          return;
        }
        res.statusCode = 404; res.end('not found');
      });
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const child = spawnPowerShell(uiPowershell(port, title, Number(rootProps.width ?? 480), Number(rootProps.height ?? 600)), true);
        child.on('exit', () => server.close(() => process.exit(0)));
      });
      return;
    }

    if (runtime.commands.length === 0) {
      showOutputWindow(runtime.output);
    }
  } catch (e) {
    showOutputWindow([e instanceof Error ? `${e.name}: ${e.message}` : String(e)], 'SDEV Error');
  }
}

main();