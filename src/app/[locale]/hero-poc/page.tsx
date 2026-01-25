'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Wallet, Terminal as TerminalIcon, Zap, TrendingUp, Eye, Move, Settings, Upload, RotateCcw, Copy, Check } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type CharacterState = 'idle' | 'focused' | 'hype';

interface TerminalLine {
  id: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'action';
  timestamp: Date;
}

interface MonitorPosition {
  top: number;      // percentage
  left: number;     // percentage
  width: number;    // percentage
  height: number;   // percentage
  rotateY: number;  // degrees
  rotateX: number;  // degrees
}

// =============================================================================
// MOCK DATA & CONFIG
// =============================================================================

const CHARACTER_GIFS: Record<CharacterState, string> = {
  idle: '/videos/scene-1-idle.gif',
  focused: '/videos/scene-2-png-gif.gif',
  hype: '/videos/scene-1-idle.gif', // TODO: Replace with celebration GIF
};

// Default monitor position - ADJUST THESE once you have artwork
const DEFAULT_MONITOR_POSITION: MonitorPosition = {
  top: 15,
  left: 25,
  width: 45,
  height: 55,
  rotateY: -3,
  rotateX: 2,
};

const MOCK_TERMINAL_LINES: TerminalLine[] = [
  { id: 1, text: '> Initializing SuperRouter AI...', type: 'info', timestamp: new Date() },
  { id: 2, text: '> Connected to Solana mainnet', type: 'success', timestamp: new Date() },
  { id: 3, text: '> Scanning migration feeds...', type: 'info', timestamp: new Date() },
  { id: 4, text: '> Token detected: $WOJAK', type: 'warning', timestamp: new Date() },
  { id: 5, text: '> Analyzing liquidity... Score: 87/100', type: 'info', timestamp: new Date() },
  { id: 6, text: '> EXECUTING BUY: 0.05 SOL', type: 'action', timestamp: new Date() },
];

// =============================================================================
// MOBILE: COLLAPSIBLE PILL + TERMINAL
// =============================================================================

function MobileHeroPOC({
  characterState,
  terminalLines
}: {
  characterState: CharacterState;
  terminalLines: TerminalLine[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const moodGlow = {
    idle: 'shadow-[0_0_20px_rgba(104,172,110,0.3)]',
    focused: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    hype: 'shadow-[0_0_25px_rgba(34,197,94,0.6)]',
  };

  const moodBorder = {
    idle: 'border-brand-primary/30',
    focused: 'border-blue-500/50',
    hype: 'border-green-500/60',
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`relative overflow-hidden transition-all duration-300 ease-out ${moodGlow[characterState]}`}>
        {/* THE PILL */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-full flex items-center justify-between gap-3 px-4 py-3
            bg-black/90 backdrop-blur-xl
            border ${moodBorder[characterState]}
            ${isExpanded ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl'}
            transition-all duration-200
          `}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-white/50">Balance</span>
              <div className="flex items-center gap-1">
                <span className="text-white font-bold tabular-nums">1.234</span>
                <Image src="/logos/solana.png" alt="SOL" width={14} height={14} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-white/40">Total</span>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold tabular-nums">2.567</span>
              <Image src="/logos/solana.png" alt="SOL" width={12} height={12} className="opacity-70" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full
              ${characterState === 'idle' ? 'bg-brand-primary animate-pulse' : ''}
              ${characterState === 'focused' ? 'bg-blue-500 animate-ping' : ''}
              ${characterState === 'hype' ? 'bg-green-500' : ''}
            `} />
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-white/50" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/50" />
            )}
          </div>
        </button>

        {/* COLLAPSIBLE TERMINAL */}
        <div className={`
          overflow-hidden transition-all duration-300 ease-out
          ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className={`
            bg-black/95 backdrop-blur-xl
            border-x border-b ${moodBorder[characterState]}
            rounded-b-2xl p-3
          `}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <TerminalIcon className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Live Feed</span>
              <div className="flex-1" />
              <span className="text-[10px] font-mono text-brand-primary animate-pulse">LIVE</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto font-mono text-xs">
              {terminalLines.map((line) => (
                <div
                  key={line.id}
                  className={`
                    ${line.type === 'info' ? 'text-white/70' : ''}
                    ${line.type === 'success' ? 'text-green-400' : ''}
                    ${line.type === 'warning' ? 'text-yellow-400' : ''}
                    ${line.type === 'action' ? 'text-brand-primary font-bold' : ''}
                  `}
                >
                  {line.text}
                </div>
              ))}
              <div className="text-white/30 animate-pulse">{'>'} _</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DESKTOP: CHARACTER SCENE + MONITOR OVERLAY (WITH CALIBRATION)
// =============================================================================

function DesktopHeroPOC({
  characterState,
  terminalLines,
  customImage,
  monitorPosition,
  showCalibration,
  onPositionChange,
}: {
  characterState: CharacterState;
  terminalLines: TerminalLine[];
  customImage: string | null;
  monitorPosition: MonitorPosition;
  showCalibration: boolean;
  onPositionChange: (pos: MonitorPosition) => void;
}) {
  const moodGlow = {
    idle: 'shadow-[0_0_40px_rgba(104,172,110,0.2)]',
    focused: 'shadow-[0_0_50px_rgba(59,130,246,0.3)]',
    hype: 'shadow-[0_0_60px_rgba(34,197,94,0.4)]',
  };

  // Determine what to show as background
  const backgroundSrc = customImage || CHARACTER_GIFS[characterState];

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className={`relative rounded-2xl overflow-hidden ${moodGlow[characterState]}`}>
        <div className="relative aspect-video bg-black">
          {/* Background/Scene */}
          <img
            src={backgroundSrc}
            alt="Scene"
            className="w-full h-full object-cover"
          />

          {/* MONITOR OVERLAY PANEL */}
          <div
            className={`
              absolute
              ${showCalibration ? 'border-2 border-dashed border-yellow-400' : 'border border-white/20'}
              bg-black/80 backdrop-blur-sm
              rounded-lg overflow-hidden
            `}
            style={{
              top: `${monitorPosition.top}%`,
              left: `${monitorPosition.left}%`,
              width: `${monitorPosition.width}%`,
              height: `${monitorPosition.height}%`,
              transform: `perspective(1000px) rotateY(${monitorPosition.rotateY}deg) rotateX(${monitorPosition.rotateX}deg)`,
            }}
          >
            {/* Calibration indicator */}
            {showCalibration && (
              <div className="absolute top-1 left-1 bg-yellow-400 text-black text-[8px] px-1 rounded font-mono z-20">
                MONITOR AREA
              </div>
            )}

            {/* Monitor bezel */}
            <div className="absolute inset-0 border-4 border-zinc-800 rounded-lg pointer-events-none z-10" />

            {/* Monitor content */}
            <div className="relative z-0 h-full p-3 overflow-hidden">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-[10px] font-mono text-white/50">superrouter.ai</span>
              </div>

              <div className="space-y-1 font-mono text-[10px] text-green-400 overflow-y-auto max-h-[calc(100%-30px)]">
                {terminalLines.slice(0, 5).map((line) => (
                  <div
                    key={line.id}
                    className={`
                      ${line.type === 'info' ? 'text-white/70' : ''}
                      ${line.type === 'success' ? 'text-green-400' : ''}
                      ${line.type === 'warning' ? 'text-yellow-400' : ''}
                      ${line.type === 'action' ? 'text-brand-primary font-bold' : ''}
                    `}
                  >
                    {line.text}
                  </div>
                ))}
                <div className="text-white/30 animate-pulse">{'>'} _</div>
              </div>

              {/* CRT effect */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)',
                }}
              />
            </div>
          </div>

          {/* Gradient fades */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CALIBRATION PANEL
// =============================================================================

function CalibrationPanel({
  position,
  onChange,
  onReset,
  onCopyCode,
}: {
  position: MonitorPosition;
  onChange: (pos: MonitorPosition) => void;
  onReset: () => void;
  onCopyCode: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-yellow-400">Monitor Position Calibration</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Position controls */}
        <div>
          <label className="text-white/50 block mb-1">Top (%)</label>
          <input
            type="range"
            min="0"
            max="50"
            value={position.top}
            onChange={(e) => onChange({ ...position, top: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.top}%</span>
        </div>

        <div>
          <label className="text-white/50 block mb-1">Left (%)</label>
          <input
            type="range"
            min="0"
            max="60"
            value={position.left}
            onChange={(e) => onChange({ ...position, left: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.left}%</span>
        </div>

        <div>
          <label className="text-white/50 block mb-1">Width (%)</label>
          <input
            type="range"
            min="20"
            max="70"
            value={position.width}
            onChange={(e) => onChange({ ...position, width: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.width}%</span>
        </div>

        <div>
          <label className="text-white/50 block mb-1">Height (%)</label>
          <input
            type="range"
            min="20"
            max="80"
            value={position.height}
            onChange={(e) => onChange({ ...position, height: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.height}%</span>
        </div>

        <div>
          <label className="text-white/50 block mb-1">Rotate Y (deg)</label>
          <input
            type="range"
            min="-20"
            max="20"
            value={position.rotateY}
            onChange={(e) => onChange({ ...position, rotateY: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.rotateY}deg</span>
        </div>

        <div>
          <label className="text-white/50 block mb-1">Rotate X (deg)</label>
          <input
            type="range"
            min="-20"
            max="20"
            value={position.rotateX}
            onChange={(e) => onChange({ ...position, rotateX: Number(e.target.value) })}
            className="w-full accent-yellow-400"
          />
          <span className="text-white/70">{position.rotateX}deg</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded-lg transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy Config'}
        </button>
      </div>

      {/* Current config display */}
      <div className="mt-4 p-2 bg-black/50 rounded-lg font-mono text-[10px] text-white/50 overflow-x-auto">
        <pre>{JSON.stringify(position, null, 2)}</pre>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function HeroPOCPage() {
  const [characterState, setCharacterState] = useState<CharacterState>('idle');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(MOCK_TERMINAL_LINES);
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [isMobile, setIsMobile] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);
  const [monitorPosition, setMonitorPosition] = useState<MonitorPosition>(DEFAULT_MONITOR_POSITION);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Simulate live terminal
  useEffect(() => {
    const messages = [
      { text: '> New migration detected...', type: 'info' as const },
      { text: '> Checking holder distribution...', type: 'info' as const },
      { text: '> Liquidity locked: YES', type: 'success' as const },
      { text: '> Whale wallet detected - SKIP', type: 'warning' as const },
      { text: '> Token $MEME passed filters', type: 'success' as const },
      { text: '> EXECUTING BUY: 0.1 SOL', type: 'action' as const },
    ];

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setTerminalLines(prev => [
        ...prev.slice(-10),
        { id: Date.now(), text: randomMsg.text, type: randomMsg.type, timestamp: new Date() }
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy config to clipboard
  const handleCopyConfig = () => {
    const config = `const MONITOR_POSITION = ${JSON.stringify(monitorPosition, null, 2)};`;
    navigator.clipboard.writeText(config);
  };

  const showMobileView = viewMode === 'mobile' || (viewMode === 'auto' && isMobile);
  const showDesktopView = viewMode === 'desktop' || (viewMode === 'auto' && !isMobile);

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-brand-primary mb-2 font-mono">
          HERO POC
        </h1>
        <p className="text-white/50 text-sm">
          Upload your artwork and calibrate the monitor overlay position
        </p>
      </div>

      {/* Controls Row */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap gap-4">
        {/* View Mode */}
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setViewMode('auto')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'auto' ? 'bg-brand-primary text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'mobile' ? 'bg-brand-primary text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            Mobile
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              viewMode === 'desktop' ? 'bg-brand-primary text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            Desktop
          </button>
        </div>

        {/* Upload Image */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Scene Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {customImage && (
          <button
            onClick={() => setCustomImage(null)}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
          >
            Clear Image
          </button>
        )}

        {/* Calibration Toggle */}
        <button
          onClick={() => setShowCalibration(!showCalibration)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            showCalibration
              ? 'bg-yellow-400/20 text-yellow-400'
              : 'bg-white/5 text-white/50 hover:text-white'
          }`}
        >
          <Move className="w-4 h-4" />
          Calibration {showCalibration ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Character State Controls */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setCharacterState('idle')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              characterState === 'idle'
                ? 'bg-brand-primary text-black'
                : 'bg-white/5 text-brand-primary hover:bg-white/10'
            }`}
          >
            IDLE
          </button>
          <button
            onClick={() => setCharacterState('focused')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              characterState === 'focused'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-blue-400 hover:bg-white/10'
            }`}
          >
            FOCUSED
          </button>
          <button
            onClick={() => setCharacterState('hype')}
            className={`px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              characterState === 'hype'
                ? 'bg-green-500 text-white'
                : 'bg-white/5 text-green-400 hover:bg-white/10'
            }`}
          >
            HYPE
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-xs text-white/30 mb-4 font-mono uppercase tracking-wider">
              {showMobileView ? 'Mobile View' : 'Desktop View'}
              {customImage && ' (Custom Image)'}
            </div>

            {showMobileView && (
              <MobileHeroPOC
                characterState={characterState}
                terminalLines={terminalLines}
              />
            )}

            {showDesktopView && (
              <DesktopHeroPOC
                characterState={characterState}
                terminalLines={terminalLines}
                customImage={customImage}
                monitorPosition={monitorPosition}
                showCalibration={showCalibration}
                onPositionChange={setMonitorPosition}
              />
            )}
          </div>
        </div>

        {/* Calibration Panel (Desktop only) */}
        {showDesktopView && showCalibration && (
          <div className="lg:col-span-1">
            <CalibrationPanel
              position={monitorPosition}
              onChange={setMonitorPosition}
              onReset={() => setMonitorPosition(DEFAULT_MONITOR_POSITION)}
              onCopyCode={handleCopyConfig}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-5xl mx-auto mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <h2 className="text-sm font-bold text-blue-400 mb-3">How to Use</h2>
        <ol className="text-xs text-blue-200/70 space-y-2 list-decimal list-inside">
          <li><strong>Create your artwork</strong> - Character at desk with empty/dark monitor screen</li>
          <li><strong>Upload it</strong> - Click "Upload Scene Image" button above</li>
          <li><strong>Enable Calibration</strong> - Yellow dashed border shows the monitor overlay area</li>
          <li><strong>Adjust sliders</strong> - Position the overlay to match your monitor exactly</li>
          <li><strong>Copy Config</strong> - Get the position values to use in production code</li>
        </ol>
      </div>

      {/* Artwork Specs */}
      <div className="max-w-5xl mx-auto mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <h2 className="text-sm font-bold text-white mb-3">Artwork Specifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-white/50 block">Aspect Ratio</span>
            <span className="text-white font-mono">16:9</span>
          </div>
          <div>
            <span className="text-white/50 block">Min Resolution</span>
            <span className="text-white font-mono">1920x1080</span>
          </div>
          <div>
            <span className="text-white/50 block">Format</span>
            <span className="text-white font-mono">PNG / GIF</span>
          </div>
          <div>
            <span className="text-white/50 block">Monitor Area</span>
            <span className="text-white font-mono">Dark/Empty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
