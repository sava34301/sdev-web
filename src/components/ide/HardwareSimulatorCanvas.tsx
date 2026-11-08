import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Cpu,
  Radio,
  Gauge,
  Volume2,
  Terminal,
  Sliders,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createHardwareSimState,
  stepHardwareSimulator,
  runHardwareLoopCycle,
  type HardwareSimState,
} from '@/lang/hardware/simulator';

interface HardwareSimulatorCanvasProps {
  source: string;
  boardId: string;
  onSerialLine?: (line: string) => void;
}

export function HardwareSimulatorCanvas({
  source,
  boardId,
  onSerialLine,
}: HardwareSimulatorCanvasProps) {
  const [simState, setSimState] = useState<HardwareSimState>(() =>
    createHardwareSimState(source, boardId)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [tickSpeedMs, setTickSpeedMs] = useState(350);
  const lastSerialCountRef = useRef(0);

  // Re-initialize when source or boardId changes
  useEffect(() => {
    setIsPlaying(false);
    lastSerialCountRef.current = 0;
    setSimState(createHardwareSimState(source, boardId));
  }, [source, boardId]);

  // Forward new serial lines to IDE output log if requested
  useEffect(() => {
    if (simState.serialLog.length > lastSerialCountRef.current) {
      const added = simState.serialLog.slice(lastSerialCountRef.current);
      lastSerialCountRef.current = simState.serialLog.length;
      if (onSerialLine) {
        for (const line of added) {
          onSerialLine(`[sim:serial] ${line}`);
        }
      }
    }
  }, [simState.serialLog, onSerialLine]);

  // Continuous play interval
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setSimState((prev) => stepHardwareSimulator(prev));
    }, tickSpeedMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, tickSpeedMs]);

  const handleStep = useCallback(() => {
    setIsPlaying(false);
    setSimState((prev) => stepHardwareSimulator(prev));
  }, []);

  const handleCycle = useCallback(() => {
    setIsPlaying(false);
    setSimState((prev) => runHardwareLoopCycle(prev));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    lastSerialCountRef.current = 0;
    setSimState(createHardwareSimState(source, boardId));
  }, [source, boardId]);

  const toggleButton = (pin: string) => {
    setSimState((prev) => {
      const nextPressed = !prev.buttonStates[pin];
      const nextPins = { ...prev.pins };
      if (nextPins[pin]) {
        nextPins[pin] = {
          ...nextPins[pin],
          digital: nextPressed,
          pwm: nextPressed ? 255 : 0,
        };
      }
      return {
        ...prev,
        buttonStates: { ...prev.buttonStates, [pin]: nextPressed },
        pins: nextPins,
      };
    });
  };

  const updateAnalog = (pin: string, val: number) => {
    setSimState((prev) => ({
      ...prev,
      analogInputs: { ...prev.analogInputs, [pin]: val },
      pins: prev.pins[pin]
        ? { ...prev.pins, [pin]: { ...prev.pins[pin], analog: val } }
        : prev.pins,
    }));
  };

  const builtinPinKey = String(simState.builtinLedPin);
  const builtinPinState = simState.pins[builtinPinKey];
  const builtinLedOn = Boolean(builtinPinState?.digital || (builtinPinState?.pwm ?? 0) > 0);
  const builtinBrightness = builtinPinState?.pwm ? builtinPinState.pwm / 255 : builtinLedOn ? 1 : 0;

  const digitalPinList = Object.values(simState.pins).filter(
    (p) => !String(p.pin).startsWith('A')
  );
  const analogPinKeys = Object.keys(simState.analogInputs);

  const currentInstruction = !simState.setupDone
    ? simState.setupInstructions[0]?.raw ?? 'setup()'
    : simState.loopInstructions[simState.loopCursor]?.raw ?? 'loop()';

  return (
    <div className="rounded-md border border-primary/30 bg-card/70 p-2.5 space-y-2.5 text-xs">
      {/* Top Bar: Board & Controls */}
      <div className="flex items-center justify-between gap-1.5 border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold truncate">{simState.boardLabel} Simulator</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            {simState.elapsedMs}ms
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isPlaying ? 'default' : 'outline'}
            className="h-6 px-2 text-[11px] gap-1"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={Boolean(simState.error)}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? 'Pause' : 'Simulate'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[11px]"
            onClick={handleStep}
            disabled={Boolean(simState.error)}
            title="Step single instruction"
          >
            <SkipForward className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[11px] font-mono"
            onClick={handleCycle}
            disabled={Boolean(simState.error)}
            title="Run full loop() cycle"
          >
            +1 Loop
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[11px]"
            onClick={handleReset}
            title="Reset MCU"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {simState.error ? (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-300">
          {simState.error}
        </div>
      ) : (
        <>
          {/* Next Instruction & Cycle Counter */}
          <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60 border border-border/30 font-mono text-[11px]">
            <div className="truncate text-muted-foreground">
              <span className="text-primary font-semibold mr-1.5">
                {!simState.setupDone ? '[setup]' : `[loop #${simState.cycleCount + 1}]`}
              </span>
              <span className="text-foreground">{currentInstruction}</span>
            </div>
            <select
              value={tickSpeedMs}
              onChange={(e) => setTickSpeedMs(Number(e.target.value))}
              className="bg-transparent text-[10px] text-muted-foreground outline-none cursor-pointer"
              title="Simulation step speed"
            >
              <option value={600} className="bg-card">Slow (600ms)</option>
              <option value={350} className="bg-card">Normal (350ms)</option>
              <option value={120} className="bg-card">Fast (120ms)</option>
              <option value={40} className="bg-card">Turbo (40ms)</option>
            </select>
          </div>

          {/* Virtual Breadboard Hero: Built-in LED + Peripherals */}
          <div className="grid grid-cols-2 gap-2">
            {/* Built-in LED Card */}
            <div className="rounded border border-border/40 bg-background/50 p-2 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-amber-400" />
                  Built-in LED (D{simState.builtinLedPin})
                </div>
                <div className="font-mono text-[11px] font-semibold">
                  {builtinLedOn
                    ? `ON (${Math.round(builtinBrightness * 100)}%)`
                    : 'OFF (0V)'}
                </div>
              </div>
              <div
                className="w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center"
                style={{
                  backgroundColor: builtinLedOn
                    ? `rgba(250, 204, 21, ${0.35 + builtinBrightness * 0.65})`
                    : 'rgba(100, 116, 139, 0.15)',
                  borderColor: builtinLedOn ? '#facc15' : 'rgba(148, 163, 184, 0.3)',
                  boxShadow: builtinLedOn
                    ? `0 0 ${12 * builtinBrightness}px rgba(250, 204, 21, 0.85)`
                    : 'none',
                }}
              >
                <Zap
                  className={`w-3.5 h-3.5 ${
                    builtinLedOn ? 'text-amber-950 fill-amber-950' : 'text-muted-foreground/30'
                  }`}
                />
              </div>
            </div>

            {/* Servo / Buzzer / Status Card */}
            <div className="rounded border border-border/40 bg-background/50 p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Servo
                </span>
                <span className="font-mono text-foreground">
                  {simState.servoAngle !== null ? `${simState.servoAngle}° (D${simState.servoPin})` : 'idle'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-purple-400" /> Buzzer
                </span>
                <span className="font-mono text-foreground">
                  {simState.activeToneHz ? `${simState.activeToneHz} Hz` : 'silent'}
                </span>
              </div>
            </div>
          </div>

          {/* GPIO Pinout Grid */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>GPIO Pinout Canvas</span>
              <span className="text-[9px]">Click pin to toggle input</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {digitalPinList.map((p) => {
                const key = String(p.pin);
                const isHigh = p.digital || p.pwm > 0;
                const pwmPct = Math.round((p.pwm / 255) * 100);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleButton(key)}
                    className={`rounded border px-1.5 py-1 text-left transition-all font-mono text-[10px] ${
                      isHigh
                        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-sm'
                        : 'border-border/40 bg-background/40 text-muted-foreground hover:border-border'
                    }`}
                    title={`Pin D${p.pin} (${p.mode}) — click to toggle input state`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">D{p.pin}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isHigh ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-muted-foreground/30'
                        }`}
                      />
                    </div>
                    <div className="text-[9px] opacity-80 truncate">
                      {p.mode === 'PWM'
                        ? `PWM ${pwmPct}%`
                        : p.mode === 'SERVO'
                        ? `${p.servoAngle ?? 90}°`
                        : isHigh
                        ? 'HIGH'
                        : 'LOW'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Pushbuttons & Analog Sliders */}
          <div className="rounded border border-border/40 bg-background/40 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                <Radio className="w-3 h-3 text-primary" /> Virtual Pushbuttons
              </span>
              <div className="flex gap-1">
                {(['2', '3', '4'] as const).map((btnPin) => {
                  const pressed = Boolean(simState.buttonStates[btnPin]);
                  return (
                    <button
                      key={btnPin}
                      type="button"
                      onClick={() => toggleButton(btnPin)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        pressed
                          ? 'bg-primary text-primary-foreground border-primary font-semibold'
                          : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'
                      }`}
                    >
                      BTN D{btnPin}: {pressed ? 'HELD' : 'OPEN'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Analog Sliders (A0, A1, A2) */}
            <div className="space-y-1 pt-1 border-t border-border/30">
              <div className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" /> Analog Sensors (0–1023)
              </div>
              {analogPinKeys.slice(0, 3).map((aPin, i) => {
                const val = simState.analogInputs[aPin] ?? 512;
                const sensorName = i === 0 ? 'Potentiometer' : i === 1 ? 'Light (LDR)' : 'Temp (TMP36)';
                return (
                  <div key={aPin} className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="w-24 truncate text-muted-foreground">
                      {aPin} ({sensorName})
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1023}
                      value={val}
                      onChange={(e) => updateAnalog(aPin, Number(e.target.value))}
                      className="flex-1 h-1.5 accent-primary cursor-pointer"
                    />
                    <span className="w-9 text-right text-foreground">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Addressable RGB NeoPixels (if any non-zero or always compact strip) */}
          <div className="rounded border border-border/40 bg-background/40 p-2 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">
              WS2812 NeoPixels
            </span>
            <div className="flex items-center gap-1.5">
              {simState.neopixels.map((np) => {
                const lit = np.r > 0 || np.g > 0 || np.b > 0;
                const cssColor = lit ? `rgb(${np.r}, ${np.g}, ${np.b})` : 'rgba(148,163,184,0.15)';
                return (
                  <div
                    key={np.index}
                    className="w-3.5 h-3.5 rounded-full border border-border/60 transition-all"
                    style={{
                      backgroundColor: cssColor,
                      boxShadow: lit ? `0 0 8px ${cssColor}` : 'none',
                    }}
                    title={`Pixel #${np.index}: RGB(${np.r}, ${np.g}, ${np.b})`}
                  />
                );
              })}
            </div>
          </div>

          {/* Simulated Serial Monitor Output */}
          <div className="rounded border border-border/40 bg-background/80 p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Terminal className="w-3 h-3 text-emerald-400" /> Virtual Serial Monitor ({simState.baudRate} baud)
              </span>
              <span>{simState.serialLog.length} lines</span>
            </div>
            <div className="max-h-24 overflow-y-auto font-mono text-[11px] space-y-0.5 text-emerald-300/90">
              {simState.serialLog.length === 0 ? (
                <div className="text-muted-foreground/40 italic">
                  No serial output yet. Click Simulate or +1 Loop.
                </div>
              ) : (
                simState.serialLog.slice(-15).map((line, idx) => (
                  <div key={idx} className="truncate">
                    &gt; {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
