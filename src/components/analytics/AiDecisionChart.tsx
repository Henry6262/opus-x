
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AiDecisionChartProps {
    data: {
        decision: string;
        count: number;
    }[];
}

export function AiDecisionChart({ data }: AiDecisionChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <Card className="glass-panel border-white/10">
            <CardHeader>
                <CardTitle className="text-lg font-mono text-cyan-400">AI Decision Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {data.map((item) => {
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;
                        let color = "bg-gray-500";
                        if (item.decision === "ENTER") color = "bg-green-500";
                        if (item.decision === "PASS") color = "bg-red-500";
                        if (item.decision === "WAIT") color = "bg-yellow-500";

                        return (
                            <div key={item.decision} className="space-y-1">
                                <div className="flex justify-between text-xs font-mono text-gray-400">
                                    <span>{item.decision}</span>
                                    <span>{item.count} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
