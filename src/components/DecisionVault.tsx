import React, { useState } from 'react';
import { BookOpen, Trash2, ArrowRight, ExternalLink, Calendar, Plus } from 'lucide-react';
import type { DecisionAnalysis } from '../types/decision.ts';

interface DecisionVaultProps {
  savedDecisions: DecisionAnalysis[];
  onSelectDecision: (decision: DecisionAnalysis) => void;
  onDeleteDecision: (id: string) => void;
  onNewDecision: () => void;
}

export const DecisionVault: React.FC<DecisionVaultProps> = ({
  savedDecisions,
  onSelectDecision,
  onDeleteDecision,
  onNewDecision,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'career', 'finance', 'technology', 'business', 'lifestyle', 'personal'];

  const filtered = selectedCategory === 'all'
    ? savedDecisions
    : savedDecisions.filter((d) => d.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
            Decision Vault & Archive
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
            Past evaluations, trade-off matrices, and verdicts stored for long-term review.
          </p>
        </div>

        <button
          onClick={onNewDecision}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Decision</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Decision Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-zinc-200 p-8">
          <BookOpen className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-zinc-900">No decisions in this category</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Analyze a dilemma in the Decision Lab to automatically archive it here.
          </p>
          <button
            onClick={onNewDecision}
            className="mt-4 px-4 py-2 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Create Dilemma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs hover:border-zinc-400 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                  <span className="capitalize font-medium text-zinc-700">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDecision(item.id);
                      }}
                      className="text-zinc-400 hover:text-rose-600 p-1 transition-colors"
                      title="Delete from archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 mb-1.5">
                  {item.title}
                </h3>

                <div className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-3">
                  {item.verdict.summary}
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 mb-3 text-xs">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-0.5">
                    Recommended Verdict
                  </div>
                  <div className="font-medium text-zinc-900 line-clamp-1">
                    {item.verdict.headline}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs">
                <span className="text-zinc-500 font-mono">
                  {item.options.length} options evaluated
                </span>
                <button
                  onClick={() => onSelectDecision(item)}
                  className="font-medium text-zinc-900 group-hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Full Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
