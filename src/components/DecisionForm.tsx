import React, { useState } from 'react';
import { ArrowRight, Plus, Trash2, Sparkles, Lightbulb, Loader2, Check } from 'lucide-react';

interface DecisionFormProps {
  onAnalyze: (payload: {
    title: string;
    context: string;
    options: string[];
    category: string;
    preferredView?: 'proscons' | 'matrix' | 'swot' | 'verdict';
  }) => Promise<void>;
  isLoading: boolean;
  onSelectSample: (id: string) => void;
}

const STARTER_DILEMMAS = [
  {
    category: 'business',
    title: 'Should I offer my software for free with paid features, or charge a flat $20/month premium plan?',
    context: 'SaaS monetization choice: Viral freemium adoption with paid feature tiers vs upfront $20/mo cash flow validation.',
    options: ['Freemium (Free tier + paid features)', 'Flat $20/Month Plan'],
    preferredView: 'proscons' as const,
  },
  {
    category: 'lifestyle',
    title: 'What should I eat tonight: Sushi or Chinese food?',
    context: 'Dinner dilemma between light, clean sushi or savory, comforting Chinese food with tomorrow lunch leftovers.',
    options: ['Sushi Dinner', 'Chinese Food Takeout'],
    preferredView: 'matrix' as const,
  },
  {
    category: 'career',
    title: 'Accept AI Startup Offer ($195k + 0.8% equity) vs Big Tech Principal ($260k liquid)',
    context: 'Weighing rapid title growth and high equity upside against golden handcuffs, work-life balance, and guaranteed liquidity.',
    options: ['Join Series-B AI Startup', 'Stay at Big Tech as Principal'],
    preferredView: 'proscons' as const,
  },
  {
    category: 'finance',
    title: 'Buy a $580k Suburban Townhome vs Rent Downtown & Invest Surplus in Index Funds',
    context: 'Current mortgage rate is 6.4%. Have $100k down payment ready. Commute and maintenance vs liquid wealth growth.',
    options: ['Buy Suburban Townhome', 'Rent Downtown & Invest Surplus'],
    preferredView: 'matrix' as const,
  },
];

export const DecisionForm: React.FC<DecisionFormProps> = ({
  onAnalyze,
  isLoading,
  onSelectSample,
}) => {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('business');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [letAiInferOptions, setLetAiInferOptions] = useState(true);
  const [analysisType, setAnalysisType] = useState<'proscons' | 'matrix' | 'swot' | 'verdict'>('proscons');

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
      preferredView: analysisType,
    });
  };

  const applyPreset = (preset: typeof STARTER_DILEMMAS[0]) => {
    setTitle(preset.title);
    setContext(preset.context);
    setCategory(preset.category);
    setOptions(preset.options);
    setLetAiInferOptions(false);
    if (preset.preferredView) {
      setAnalysisType(preset.preferredView);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Intro Editorial Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
          The Tiebreaker Decision Engine
        </h1>
        <p className="mt-2 text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed">
          Provide any dilemma you need to resolve, select your preferred evaluation framework,
          and click <strong>Get Analysis</strong>.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Decision Dilemma Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="dilemma-title"
                className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider"
              >
                What decision do you need to make? <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              id="dilemma-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Should I offer my software for free with paid features, or charge a flat $20/month premium plan?"
              required
              className="w-full px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors shadow-2xs"
            />

            {/* Quick Lab Test Scenarios */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500">Quick Test Scenarios:</span>
              <button
                type="button"
                onClick={() => {
                  setTitle('Should I offer my software for free with paid features, or charge a flat $20/month premium plan?');
                  setContext('Deciding between freemium adoption with paid add-ons vs charging a flat $20/month subscription.');
                  setCategory('business');
                  setAnalysisType('proscons');
                  setLetAiInferOptions(true);
                }}
                className="text-left px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-medium transition-colors"
                title="Fill scenario 1: Software pricing dilemma with Pros and Cons List"
              >
                💡 Lab Test 1: Software Freemium vs $20/mo (Pros & Cons)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTitle('What should I eat tonight: Sushi or Chinese food?');
                  setContext('Dinner choice between fresh Japanese sushi or savory Chinese takeout.');
                  setCategory('lifestyle');
                  setAnalysisType('matrix');
                  setLetAiInferOptions(true);
                }}
                className="text-left px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-medium transition-colors"
                title="Fill scenario 2: Dinner dilemma with Comparison Table"
              >
                🍜 Lab Test 2: Sushi or Chinese food? (Comparison Table)
              </button>
            </div>
          </div>

          {/* Analysis Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
              Select Analysis Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setAnalysisType('proscons')}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  analysisType === 'proscons'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Pros and Cons List</span>
                  {analysisType === 'proscons' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <div
                  className={`text-[10px] mt-1 leading-tight ${
                    analysisType === 'proscons' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Weighted impacts & mitigations
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisType('matrix')}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  analysisType === 'matrix'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Comparison Table</span>
                  {analysisType === 'matrix' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <div
                  className={`text-[10px] mt-1 leading-tight ${
                    analysisType === 'matrix' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Multi-criteria scoring matrix
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisType('swot')}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  analysisType === 'swot'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>SWOT Analysis</span>
                  {analysisType === 'swot' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <div
                  className={`text-[10px] mt-1 leading-tight ${
                    analysisType === 'swot' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  2×2 internal & external canvas
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisType('verdict')}
                className={`p-3 text-left border rounded-lg transition-all cursor-pointer ${
                  analysisType === 'verdict'
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>The Verdict</span>
                  {analysisType === 'verdict' && <Check className="w-3.5 h-3.5 text-zinc-200" />}
                </div>
                <div
                  className={`text-[10px] mt-1 leading-tight ${
                    analysisType === 'verdict' ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  Decisive ruling & blind spots
                </div>
              </button>
            </div>
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
                className="w-full px-3.5 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors"
              >
                <option value="business">Business & Product Strategy</option>
                <option value="career">Career & Professional Growth</option>
                <option value="finance">Financial & Capital Allocation</option>
                <option value="lifestyle">Lifestyle & Food / Housing</option>
                <option value="technology">Architecture & Engineering</option>
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
                  Auto-infer competing options from question
                </span>
              </label>
            </div>
          </div>

          {/* Options Configuration */}
          {!letAiInferOptions && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Specific Competing Options
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
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
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
              Context & Constraints <span className="text-zinc-400 font-normal normal-case">(Optional)</span>
            </label>
            <textarea
              id="context"
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What are your non-negotiables, timeline, budget, or key priorities?"
              className="w-full px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors resize-y"
            />
          </div>

          {/* Primary Action Button: "Get Analysis" */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-sm font-semibold rounded-lg transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Analysis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Get Analysis</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Preset Dilemmas */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-4 h-4 text-zinc-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            Or load a classic dilemma scenario:
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
