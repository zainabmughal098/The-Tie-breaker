import React, { useState } from 'react';
import { ArrowRight, Plus, Trash2, Sparkles, Lightbulb, Compass, Loader2 } from 'lucide-react';

interface DecisionFormProps {
  onAnalyze: (payload: {
    title: string;
    context: string;
    options: string[];
    category: string;
  }) => Promise<void>;
  isLoading: boolean;
  onSelectSample: (id: string) => void;
}

const STARTER_DILEMMAS = [
  {
    category: 'career',
    title: 'Accept AI Startup Offer ($195k + 0.8% equity) vs Big Tech Principal ($260k liquid)',
    context: 'Weighing rapid title growth and high equity upside against golden handcuffs, work-life balance, and guaranteed liquidity.',
    options: ['Join Series-B AI Startup', 'Stay at Big Tech as Principal'],
  },
  {
    category: 'finance',
    title: 'Buy a $580k Suburban Townhome vs Rent Downtown & Invest Surplus in Index Funds',
    context: 'Current mortgage rate is 6.4%. Have $100k down payment ready. Commute and maintenance vs liquid wealth growth.',
    options: ['Buy Suburban Townhome', 'Rent Downtown & Invest Surplus'],
  },
  {
    category: 'technology',
    title: 'Migrate to Event-Driven Microservices vs Refactor into Modular Monolith',
    context: 'Engineering team of 14 experiencing release friction and flaky shared tests. Want higher deployment autonomy without massive operational tax.',
    options: ['Event-Driven Microservices', 'Modular Monolith with Strict Boundaries'],
  },
  {
    category: 'business',
    title: 'Launch Enterprise B2B Tier vs Double Down on Product-Led Growth (PLG)',
    context: 'Mid-stage SaaS with 20k self-serve users. Enterprise customers requesting SOC2, custom contracts, and high ACVs.',
    options: ['Build Dedicated Enterprise Sales Engine', 'Stay Lean with Automated PLG Funnel'],
  },
];

export const DecisionForm: React.FC<DecisionFormProps> = ({
  onAnalyze,
  isLoading,
  onSelectSample,
}) => {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('career');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [letAiInferOptions, setLetAiInferOptions] = useState(false);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isLoading) return;

    const filteredOptions = letAiInferOptions
      ? []
      : options.map((o) => o.trim()).filter((o) => o.length > 0);

    onAnalyze({
      title: title.trim(),
      context: context.trim(),
      options: filteredOptions,
      category,
    });
  };

  const applyPreset = (preset: typeof STARTER_DILEMMAS[0]) => {
    setTitle(preset.title);
    setContext(preset.context);
    setCategory(preset.category);
    setOptions(preset.options);
    setLetAiInferOptions(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Intro Editorial Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          Eliminate Decision Paralysis
        </h1>
        <p className="mt-2 text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed">
          Break through cognitive bias and fatigue. Provide your dilemma to generate
          in-depth Pros & Cons with mitigations, dynamic comparison criteria, SWOT analyses,
          and the authoritative Tiebreaker Verdict.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Decision Dilemma Title */}
          <div>
            <label htmlFor="dilemma-title" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              The Decision Dilemma <span className="text-rose-500">*</span>
            </label>
            <input
              id="dilemma-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Should I leave my stable job to start an agency, or scale it as a side hustle?"
              required
              className="w-full px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
            />
          </div>

          {/* Category & AI Option Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
                Domain / Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
              >
                <option value="career">Career & Professional Growth</option>
                <option value="business">Business & Product Strategy</option>
                <option value="finance">Financial & Capital Allocation</option>
                <option value="technology">Architecture & Engineering</option>
                <option value="lifestyle">Housing & Lifestyle</option>
                <option value="team">Team & Organizational</option>
                <option value="personal">Personal Dilemma</option>
              </select>
            </div>

            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={letAiInferOptions}
                  onChange={(e) => setLetAiInferOptions(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="font-medium">
                  Auto-infer competing options with AI
                </span>
              </label>
            </div>
          </div>

          {/* Options Configuration */}
          {!letAiInferOptions && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Competing Options Under Consideration
                </label>
                <span className="text-xs text-zinc-500">
                  {options.length} options (max 5)
                </span>
              </div>

              <div className="space-y-2.5">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-xs font-mono text-zinc-400 text-right">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} (e.g., ${
                        idx === 0 ? 'Accept the job offer' : 'Decline and stay'
                      })`}
                      className="flex-1 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 py-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add another competing option</span>
                </button>
              )}
            </div>
          )}

          {/* Context & Constraints */}
          <div>
            <label htmlFor="context" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
              Context, Constraints & Known Priorities <span className="text-zinc-400 font-normal normal-case">(Optional but recommended)</span>
            </label>
            <textarea
              id="context"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What are your non-negotiables? Budget limits, timing constraints, risk appetite, family impact, or key fears?"
              className="w-full px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors resize-y"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-sm font-medium rounded-lg transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Multi-Variable Trade-offs...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run The Tiebreaker Analysis</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Dilemma Starters / Presets */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-zinc-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Or explore classic high-stakes dilemmas:
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STARTER_DILEMMAS.map((preset, index) => (
            <div
              key={index}
              onClick={() => applyPreset(preset)}
              className="text-left p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                <span className="capitalize">{preset.category}</span>
                <span className="text-zinc-400 group-hover:text-zinc-700 transition-colors">
                  Load dilemma →
                </span>
              </div>
              <h3 className="text-sm font-medium text-zinc-900 group-hover:text-zinc-900 line-clamp-1">
                {preset.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                {preset.context}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
