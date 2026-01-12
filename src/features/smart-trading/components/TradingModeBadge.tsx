import { cn } from '@/lib/utils';

interface TradingModeBadgeProps {
    mode?: 'paper' | 'real';
    className?: string;
}

export function TradingModeBadge({ mode = 'paper', className }: TradingModeBadgeProps) {
    const isReal = mode === 'real';

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                isReal
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                className
            )}
        >
            <span className="text-sm">{isReal ? '⚡' : '🎮'}</span>
            <span>{isReal ? 'REAL' : 'PAPER'}</span>
        </div>
    );
}
