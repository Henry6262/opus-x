/**
 * Token Performance Table
 *
 * Rankings table showing individual token performance.
 */

'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { TokenPerformance } from '@/types/trading';

interface TokenPerformanceTableProps {
  tokenPerformance: TokenPerformance[];
}

type SortKey = 'pnl' | 'pnlPct' | 'peak' | 'holdTime' | 'entry';
type SortOrder = 'asc' | 'desc';

export function TokenPerformanceTable({ tokenPerformance }: TokenPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('pnl');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedData = useMemo(() => {
    const sorted = [...tokenPerformance];

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortKey) {
        case 'pnl':
          compareValue = a.totalPnlSol - b.totalPnlSol;
          break;
        case 'pnlPct':
          compareValue = a.pnlPct - b.pnlPct;
          break;
        case 'peak':
          compareValue = a.peakPnlPct - b.peakPnlPct;
          break;
        case 'holdTime':
          compareValue = (a.holdTimeMinutes || 0) - (b.holdTimeMinutes || 0);
          break;
        case 'entry':
          compareValue = new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [tokenPerformance, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ isActive, order }: { isActive: boolean; order: SortOrder }) => {
    if (!isActive) {
      return <span className="text-gray-600">↕</span>;
    }
    return <span className="text-blue-400">{order === 'asc' ? '↑' : '↓'}</span>;
  };

  if (tokenPerformance.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No positions available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Token</th>
            <th
              className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-200"
              onClick={() => handleSort('entry')}
            >
              Entry Time <SortIcon isActive={sortKey === 'entry'} order={sortOrder} />
            </th>
            <th
              className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-200"
              onClick={() => handleSort('pnl')}
            >
              Total P&L <SortIcon isActive={sortKey === 'pnl'} order={sortOrder} />
            </th>
            <th
              className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-200"
              onClick={() => handleSort('pnlPct')}
            >
              P&L % <SortIcon isActive={sortKey === 'pnlPct'} order={sortOrder} />
            </th>
            <th
              className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-200"
              onClick={() => handleSort('peak')}
            >
              Peak % <SortIcon isActive={sortKey === 'peak'} order={sortOrder} />
            </th>
            <th
              className="text-right py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-gray-200"
              onClick={() => handleSort('holdTime')}
            >
              Hold Time <SortIcon isActive={sortKey === 'holdTime'} order={sortOrder} />
            </th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">TP</th>
            <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((token, index) => (
            <tr
              key={token.mint}
              className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-white">{token.ticker}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[120px]">
                    {token.tokenName}
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-gray-300 text-xs">
                {format(new Date(token.entryTime), 'MMM dd, HH:mm')}
              </td>
              <td
                className={`py-3 px-4 text-right font-semibold ${
                  token.totalPnlSol >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {token.totalPnlSol >= 0 ? '+' : ''}
                {token.totalPnlSol.toFixed(4)} SOL
              </td>
              <td
                className={`py-3 px-4 text-right font-semibold ${
                  token.pnlPct >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {token.pnlPct >= 0 ? '+' : ''}
                {token.pnlPct.toFixed(2)}%
              </td>
              <td
                className={`py-3 px-4 text-right ${
                  token.peakPnlPct >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {token.peakPnlPct >= 0 ? '+' : ''}
                {token.peakPnlPct.toFixed(2)}%
              </td>
              <td className="py-3 px-4 text-right text-gray-300">
                {token.holdTimeMinutes
                  ? `${Math.floor(token.holdTimeMinutes / 60)}h ${Math.floor(
                      token.holdTimeMinutes % 60
                    )}m`
                  : '-'}
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex justify-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      token.tp1Hit ? 'bg-green-400' : 'bg-gray-700'
                    }`}
                    title="TP1"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      token.tp2Hit ? 'bg-green-400' : 'bg-gray-700'
                    }`}
                    title="TP2"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      token.tp3Hit ? 'bg-green-400' : 'bg-gray-700'
                    }`}
                    title="TP3"
                  />
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    token.status === 'open'
                      ? 'bg-blue-900/50 text-blue-300'
                      : token.status === 'closed'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                  }`}
                >
                  {token.status === 'partially_closed' ? 'partial' : token.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
