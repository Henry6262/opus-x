import { useState } from 'react';
import { Copy, ExternalLink, Check } from 'lucide-react';

interface TradingWalletProps {
    walletAddress: string;
    solBalance?: number;
}

export function TradingWallet({ walletAddress, solBalance }: TradingWalletProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    const solscanUrl = `https://solscan.io/account/${walletAddress}`;

    return (
        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Trading Wallet</h3>
                {solBalance !== undefined && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-white">{solBalance.toFixed(4)} SOL</div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 rounded px-3 py-2 font-mono text-sm text-gray-300">
                    {shortAddress}
                </div>

                <button
                    onClick={handleCopy}
                    className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded transition-colors"
                    title="Copy address"
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                    ) : (
                        <Copy className="w-4 h-4 text-purple-400" />
                    )}
                </button>

                <a
                    href={solscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/40 rounded transition-colors"
                    title="View on Solscan"
                >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                </a>
            </div>

            <div className="mt-2 text-xs text-gray-500">
                All transactions are public on Solana blockchain
            </div>
        </div>
    );
}
