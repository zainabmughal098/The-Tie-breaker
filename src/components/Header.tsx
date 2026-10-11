import React from 'react';
import { Scale, Users, Disc3, BookOpen, Sparkles, Plus } from 'lucide-react';

export type ActiveTab = 'lab' | 'group' | 'coin' | 'vault';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewDecision: () => void;
  activeRoomCode?: string | null;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onNewDecision,
  activeRoomCode,
  savedCount,
}) => {
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('lab')}
              className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-90"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-5 h-5 text-zinc-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 tracking-tight text-base">
                    The Tiebreaker
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                    Decision Engine
                  </span>
                </div>
                <p className="text-xs text-zinc-500 hidden sm:block">
                  Analyze trade-offs · Resolve group deadlocks
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Segmented Switcher */}
          <nav className="flex items-center p-1 bg-zinc-100 rounded-lg">
            <button
              onClick={() => onTabChange('lab')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'lab'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Decision Lab</span>
            </button>

            <button
              onClick={() => onTabChange('group')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'group'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group Voting</span>
              {activeRoomCode && (
                <span className="ml-1 px-1.5 py-0.2 bg-zinc-900 text-white rounded text-[10px] font-mono">
                  {activeRoomCode}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('coin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'coin'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Gut-Check Coin</span>
            </button>

            <button
              onClick={() => onTabChange('vault')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'vault'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Vault</span>
              <span className="text-[11px] text-zinc-400">({savedCount})</span>
            </button>
          </nav>

          {/* New Decision Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewDecision}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Dilemma</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
