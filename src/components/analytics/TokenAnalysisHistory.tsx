
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

// Mock data type - replaced with real Supabase type in integration
interface AnalysisLog {
    id: string;
    token_symbol: string;
    decision: string;
    reasoning: string;
    confidence: number;
    analyzed_at: string;
    market_cap: number;
}

interface TokenAnalysisHistoryProps {
    logs: AnalysisLog[];
}

export function TokenAnalysisHistory({ logs }: TokenAnalysisHistoryProps) {
    return (
        <Card className="glass-panel border-white/10">
            <CardHeader>
                <CardTitle className="text-lg font-mono text-cyan-400">Analysis History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 italic">No analysis logs found</div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="p-3 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-2">
                                            {log.token_symbol}
                                            <span className={`text-xs px-2 py-0.5 rounded ${log.decision === 'ENTER' ? 'bg-green-500/20 text-green-400' :
                                                    log.decision === 'PASS' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {log.decision}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {format(new Date(log.analyzed_at), "MMM d, HH:mm:ss")}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">Confidence</div>
                                        <div className="font-mono text-cyan-400">{(log.confidence * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-300 line-clamp-3">{log.reasoning}</p>
                                <div className="mt-2 text-xs text-gray-500 font-mono">
                                    MCap: ${(log.market_cap || 0).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
