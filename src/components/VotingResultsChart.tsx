import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { CollaborativeRoom } from '../types/decision.ts';
import type { GroupConsensusMetrics } from '../utils/votingCalculator.ts';
import { BarChart3, TrendingUp } from 'lucide-react';

interface VotingResultsChartProps {
  room: CollaborativeRoom;
  consensus: GroupConsensusMetrics;
}

export const VotingResultsChart: React.FC<VotingResultsChartProps> = ({
  room,
  consensus,
}) => {
  const [metricMode, setMetricMode] = useState<'primary' | 'firstPlace'>('primary');

  if (!consensus || consensus.tallies.length === 0 || room.votes.length === 0) {
    return null;
  }

  // Format data for Recharts
  const chartData = consensus.tallies.map((tally, index) => {
    let metricValue = tally.totalScore;
    let metricLabel = 'Points';

    if (room.votingMethod === 'ranked') {
      metricLabel = 'Borda Points';
      metricValue = tally.rankPoints;
    } else if (room.votingMethod === 'score') {
      metricLabel = 'Average Score (1-10)';
      metricValue = tally.averageScore;
    } else if (room.votingMethod === 'budget') {
      metricLabel = 'Allocated Chips';
      metricValue = tally.budgetPoints;
    }

    const isWinner = tally.optionId === consensus.winnerId;

    return {
      id: tally.optionId,
      name: tally.optionName,
      shortName:
        tally.optionName.length > 20
          ? tally.optionName.substring(0, 18) + '…'
          : tally.optionName,
      value: metricMode === 'firstPlace' ? tally.firstPlaceVotes : metricValue,
      primaryValue: metricValue,
      firstPlaceVotes: tally.firstPlaceVotes,
      voteCount: tally.voteCount,
      averageScore: tally.averageScore,
      rank: index + 1,
      isWinner,
      metricLabel,
    };
  });

  const valueLabel =
    metricMode === 'firstPlace'
      ? '1st Place Votes'
      : room.votingMethod === 'ranked'
      ? 'Borda Preference Points'
      : room.votingMethod === 'score'
      ? 'Average Rating (1-10)'
      : 'Allocated Budget Points';

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 sm:p-6 shadow-xs my-6">
      {/* Header & Metric Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            <BarChart3 className="w-4 h-4 text-zinc-700" />
            <span>Real-Time Consensus Visualization</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-zinc-900">{room.votes.length} Voters</span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {valueLabel}
          </h3>
        </div>

        {/* Optional View Switcher for Ranked Choice */}
        {room.votingMethod === 'ranked' && (
          <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetricMode('primary')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metricMode === 'primary'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Overall Points
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('firstPlace')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metricMode === 'firstPlace'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              1st Choice Votes
            </button>
          </div>
        )}
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 16, left: -10, bottom: 24 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f4f4f5"
            />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11, fill: '#71717a' }}
              tickLine={false}
              axisLine={{ stroke: '#e4e4e7' }}
              interval={0}
              angle={chartData.length > 3 ? -15 : 0}
              textAnchor={chartData.length > 3 ? 'end' : 'middle'}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={room.votingMethod === 'score'}
            />
            <Tooltip
              cursor={{ fill: 'rgba(244, 244, 245, 0.6)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-900 text-white rounded-lg p-3 text-xs shadow-md border border-zinc-800">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-100 mb-1">
                        <span>#{data.rank}</span>
                        <span>{data.name}</span>
                        {data.isWinner && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded">
                            Leader
                          </span>
                        )}
                      </div>
                      <div className="text-zinc-300 font-mono text-[11px] space-y-0.5">
                        <div>
                          {data.metricLabel}: <span className="font-bold text-white">{data.primaryValue}</span>
                        </div>
                        {room.votingMethod === 'ranked' && (
                          <div className="text-zinc-400">
                            1st Place Votes: {data.firstPlaceVotes}
                          </div>
                        )}
                        {room.votingMethod === 'score' && (
                          <div className="text-zinc-400">
                            Ballots Rated: {data.voteCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              animationDuration={600}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.id}`}
                  fill={entry.isWinner ? '#18181b' : '#a1a1aa'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Subtitle / Legend */}
      <div className="mt-2 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-zinc-900 inline-block" />
            <span className="font-medium text-zinc-700">Consensus Leader</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-zinc-400 inline-block" />
            <span>Competing Options</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
          <span>Real-time live aggregation across all ballots</span>
        </div>
      </div>
    </div>
  );
};
