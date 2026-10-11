import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Grid,
  ListFilter,
  Award,
  Users,
  Copy,
  Download,
  FileDown,
  Share2,
  Check,
  ShieldAlert,
  ArrowRight,
  Plus,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import type { DecisionAnalysis, DecisionOption, ProItem, ConItem } from '../types/decision.ts';
import confetti from 'canvas-confetti';
import { exportDecisionToPDF } from '../utils/pdfExport.ts';

interface AnalysisViewProps {
  decision: DecisionAnalysis;
  onLaunchGroupRoom: (decision: DecisionAnalysis) => void;
  onSaveDecision: (decision: DecisionAnalysis) => void;
  onNewDecision: () => void;
}

type AnalysisTab = 'verdict' | 'proscons' | 'matrix' | 'swot';

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  decision,
  onLaunchGroupRoom,
  onSaveDecision,
  onNewDecision,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('verdict');
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    decision.options[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Criteria Weights State (Allows user to play with weights and watch the Matrix recalculate live)
  const [criteriaWeights, setCriteriaWeights] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    decision.criteria.forEach((c) => {
      initial[c.id] = c.weight;
    });
    return initial;
  });

  // Calculate live weighted score for an option
  const calculateWeightedScore = (option: DecisionOption): number => {
    let totalScore = 0;
    let totalWeight = 0;

    decision.criteria.forEach((crit) => {
      const weight = criteriaWeights[crit.id] ?? crit.weight;
      const scoreObj = option.criteriaScores[crit.id];
      const rawScore = scoreObj ? scoreObj.score : 5;

      totalScore += rawScore * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) return 0;
    return Number(((totalScore / (totalWeight * 10)) * 100).toFixed(1));
  };

  // Find winner based on current live weights
  const scoredOptions = decision.options.map((opt) => ({
    ...opt,
    currentScore: calculateWeightedScore(opt),
  }));
  scoredOptions.sort((a, b) => b.currentScore - a.currentScore);
  const matrixWinnerId = scoredOptions[0]?.id || decision.options[0]?.id;

  const handleWeightChange = (critId: string, val: number) => {
    setCriteriaWeights((prev) => ({
      ...prev,
      [critId]: Math.max(1, Math.min(10, val)),
    }));
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleCopySummary = () => {
    const lines = [
      `# The Tiebreaker Analysis: ${decision.title}`,
      `Category: ${decision.category}`,
      `Context: ${decision.context || 'N/A'}`,
      '',
      `## Recommended Verdict: ${decision.verdict.headline}`,
      `Confidence: ${decision.verdict.confidenceScore}%`,
      decision.verdict.summary,
      '',
      `Core Trade-off: ${decision.verdict.coreTradeoff}`,
      '',
      '## Competing Options & Scores:',
      ...decision.options.map((o) => `- ${o.name}: ${calculateWeightedScore(o)}/100`),
      '',
      `Gut Check: "${decision.verdict.gutCheckQuestion}"`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    let md = `# ${decision.title}\n\n`;
    md += `**Domain:** ${decision.category}  \n`;
    md += `**Evaluated:** ${new Date(decision.createdAt).toLocaleDateString()}  \n\n`;
    md += `### Context\n${decision.context || 'No specific background provided.'}\n\n`;

    md += `## The Tiebreaker Verdict: ${decision.verdict.headline}\n`;
    md += `**Confidence Score:** ${decision.verdict.confidenceScore}%\n\n`;
    md += `${decision.verdict.summary}\n\n`;
    md += `**Fundamental Dilemma / Trade-off:** ${decision.verdict.coreTradeoff}\n\n`;

    md += `### Blind Spots to Watch\n`;
    decision.verdict.blindSpots.forEach((b) => {
      md += `- ${b}\n`;
    });
    md += `\n`;

    md += `### Conditional Logic\n`;
    decision.verdict.conditionalGuidance.forEach((g) => {
      const opt = decision.options.find((o) => o.id === g.recommendedOptionId);
      md += `- **${g.condition}:** Choose *${opt?.name || 'this option'}*. ${g.advice}\n`;
    });
    md += `\n`;

    md += `## Deep Pros & Cons\n`;
    decision.options.forEach((opt) => {
      md += `### ${opt.name}\n${opt.description}\n\n`;
      md += `**Pros:**\n`;
      opt.pros.forEach((p) => {
        md += `- [Weight: ${p.weight}/5 | ${p.impact}] **${p.text}**: ${p.explanation || ''}\n`;
      });
      md += `\n**Cons & Mitigations:**\n`;
      opt.cons.forEach((c) => {
        md += `- [Weight: ${c.weight}/5 | ${c.impact}] **${c.text}**: ${c.explanation || ''}\n`;
        if (c.mitigation) {
          md += `  *Mitigation:* ${c.mitigation}\n`;
        }
      });
      md += `\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${decision.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tiebreaker.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    try {
      setIsExportingPdf(true);
      exportDecisionToPDF(decision, criteriaWeights);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeOption =
    decision.options.find((o) => o.id === selectedOptionId) || decision.options[0];

  const recommendedOption =
    decision.options.find((o) => o.id === decision.verdict.recommendedOptionId) ||
    decision.options[0];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Breadcrumb & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <span className="capitalize">{decision.category}</span>
            <span aria-hidden="true">·</span>
            <span>{new Date(decision.createdAt).toLocaleDateString()}</span>
            <span aria-hidden="true">·</span>
            <span>{decision.options.length} Competing Paths</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
            {decision.title}
          </h1>
          {decision.context && (
            <p className="mt-1 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed">
              {decision.context}
            </p>
          )}
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => onLaunchGroupRoom(decision)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors shadow-xs"
            title="Start a collaborative voting room with your team or group"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Launch Group Room</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white text-zinc-800 hover:text-zinc-950 border border-zinc-300 rounded-lg transition-colors shadow-xs"
            title="Download full decision evaluation report as PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-700" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Export to PDF'}</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-zinc-700 hover:text-zinc-900 border border-zinc-300 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-zinc-700 hover:text-zinc-900 border border-zinc-300 rounded-lg transition-colors"
            title="Export full evaluation as clean Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Markdown</span>
          </button>
        </div>
      </div>

      {/* Analytical View Switcher (Segmented Control) */}
      <div className="flex items-center justify-between gap-4 my-6 flex-wrap">
        <div className="flex items-center p-1 bg-zinc-100 rounded-lg">
          <button
            onClick={() => setActiveTab('verdict')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'verdict'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>The Tiebreaker Verdict</span>
          </button>

          <button
            onClick={() => setActiveTab('proscons')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'proscons'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Pros & Cons</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'matrix'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Criteria Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('swot')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'swot'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>SWOT Canvas</span>
          </button>
        </div>

        {/* Quick Option Selector for sub-views */}
        {(activeTab === 'proscons' || activeTab === 'swot') && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 mr-1">Evaluating:</span>
            {decision.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  selectedOptionId === opt.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- TAB 1: THE TIEBREAKER VERDICT ---------------- */}
      {activeTab === 'verdict' && (
        <div className="space-y-6">
          {/* Main Recommended Ruling Card */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  <span>Objective Recommendation</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">Confidence {decision.verdict.confidenceScore}%</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
                  {decision.verdict.headline}
                </h2>
                <div className="mt-2 text-xs font-medium text-zinc-800">
                  Winning Option:{' '}
                  <span className="text-zinc-900 font-semibold underline decoration-zinc-400">
                    {recommendedOption?.name}
                  </span>
                </div>
              </div>

              {/* Confidence Meter Widget */}
              <div className="sm:text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900">
                  {decision.verdict.confidenceScore}
                  <span className="text-xs text-zinc-400 font-sans font-normal ml-0.5">/100</span>
                </div>
                <div className="text-[11px] text-zinc-500">Decision Confidence Index</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100">
              <p className="text-sm text-zinc-700 leading-relaxed">
                {decision.verdict.summary}
              </p>
            </div>

            {/* Core Trade-off Highlight */}
            <div className="mt-5 p-4 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                The Core Trade-off
              </div>
              <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed">
                {decision.verdict.coreTradeoff}
              </p>
            </div>
          </div>

          {/* Blind Spots & Traps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 mb-3">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Hidden Blind Spots to Watch</span>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-700">
                {decision.verdict.blindSpots.map((spot, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <span>{spot}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conditional Branching Rules */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-3">
                <TrendingUp className="w-4 h-4 text-zinc-600" />
                <span>When to Pivot (Conditional Rules)</span>
              </div>
              <div className="space-y-3">
                {decision.verdict.conditionalGuidance.map((rule, idx) => {
                  const targetOpt = decision.options.find(
                    (o) => o.id === rule.recommendedOptionId
                  );
                  return (
                    <div key={idx} className="text-xs sm:text-sm border-l-2 border-zinc-300 pl-3">
                      <div className="font-medium text-zinc-900">{rule.condition}:</div>
                      <p className="text-zinc-600 mt-0.5 leading-relaxed">
                        Choose <span className="font-semibold text-zinc-800">{targetOpt?.name || 'this alternative'}</span>. {rule.advice}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* The Gut-Check Inquiry Card */}
          <div className="bg-zinc-900 text-white rounded-xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <span>The Instinctual Gut-Check</span>
            </div>
            <p className="text-base sm:text-lg font-serif italic text-zinc-100 leading-snug">
              "{decision.verdict.gutCheckQuestion}"
            </p>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Analytical models calculate logic; emotional clarity prevents buyer's remorse.
              If this question triggered an instant bodily reaction, respect that signal.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: PROS & CONS WITH MITIGATIONS ---------------- */}
      {activeTab === 'proscons' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
            <div className="mb-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Option Profile
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {activeOption.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                {activeOption.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
              {/* Pros Column */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
                  <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Advantages & Upside ({activeOption.pros.length})</span>
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {activeOption.pros.map((pro) => (
                    <div
                      key={pro.id}
                      className="p-3.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900">
                          {pro.text}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                          <span>w:{pro.weight}/5</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{pro.impact}</span>
                        </div>
                      </div>
                      {pro.explanation && (
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          {pro.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cons Column with Mitigation */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
                  <h3 className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Downsides & Mitigations ({activeOption.cons.length})</span>
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {activeOption.cons.map((con) => (
                    <div
                      key={con.id}
                      className="p-3.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900">
                          {con.text}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                          <span>w:{con.weight}/5</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{con.impact}</span>
                        </div>
                      </div>
                      {con.explanation && (
                        <p className="text-xs text-zinc-600 leading-relaxed mb-2">
                          {con.explanation}
                        </p>
                      )}
                      {con.mitigation && (
                        <div className="pt-2 border-t border-zinc-100 flex items-start gap-1.5 text-xs text-zinc-700">
                          <span className="font-semibold text-zinc-900 shrink-0">Mitigation:</span>
                          <span className="text-zinc-600">{con.mitigation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: DYNAMIC COMPARISON MATRIX ---------------- */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Interactive Decision Matrix
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600">
                  Drag criterion weight sliders to test how shifts in your personal or team values change the winning outcome.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-md">
                <span className="text-zinc-500">Live Calculated Winner:</span>
                <span className="font-bold text-zinc-900">
                  {decision.options.find((o) => o.id === matrixWinnerId)?.name}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="py-3 px-3 font-semibold uppercase tracking-wider text-[11px] w-1/3">
                      Criterion & Weight Slider
                    </th>
                    {decision.options.map((opt) => (
                      <th
                        key={opt.id}
                        className={`py-3 px-3 font-semibold uppercase tracking-wider text-[11px] ${
                          opt.id === matrixWinnerId ? 'text-zinc-900 bg-zinc-50/70' : 'text-zinc-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt.name}</span>
                          {opt.id === matrixWinnerId && (
                            <span className="text-[10px] font-mono text-emerald-700">#1</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {decision.criteria.map((crit) => {
                    const currentWeight = criteriaWeights[crit.id] ?? crit.weight;
                    return (
                      <tr key={crit.id} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-3 align-top">
                          <div className="font-medium text-zinc-900">{crit.name}</div>
                          {crit.description && (
                            <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                              {crit.description}
                            </div>
                          )}
                          {/* Weight Slider */}
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={currentWeight}
                              onChange={(e) => handleWeightChange(crit.id, Number(e.target.value))}
                              className="w-24 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                            />
                            <span className="text-xs font-mono text-zinc-600">
                              {currentWeight}/10
                            </span>
                          </div>
                        </td>

                        {decision.options.map((opt) => {
                          const scoreObj = opt.criteriaScores[crit.id] || { score: 5, comment: '' };
                          const score = scoreObj.score;
                          return (
                            <td
                              key={opt.id}
                              className={`py-3 px-3 align-top ${
                                opt.id === matrixWinnerId ? 'bg-zinc-50/70' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-zinc-900">
                                  {score}/10
                                </span>
                                <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-zinc-800 rounded-full"
                                    style={{ width: `${score * 10}%` }}
                                  />
                                </div>
                              </div>
                              {scoreObj.comment && (
                                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                                  {scoreObj.comment}
                                </p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Weighted Total Row */}
                <tfoot>
                  <tr className="border-t-2 border-zinc-900 bg-zinc-50/60 font-medium">
                    <td className="py-4 px-3 font-semibold text-zinc-900">
                      Weighted Index Total (0 - 100)
                    </td>
                    {decision.options.map((opt) => {
                      const total = calculateWeightedScore(opt);
                      const isWinner = opt.id === matrixWinnerId;
                      return (
                        <td
                          key={opt.id}
                          className={`py-4 px-3 font-mono text-sm ${
                            isWinner ? 'font-bold text-zinc-900' : 'text-zinc-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{total}%</span>
                            {isWinner && (
                              <span className="text-[10px] uppercase font-sans text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Leader
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: SWOT ANALYSIS CANVAS ---------------- */}
      {activeTab === 'swot' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
            <div className="mb-6">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Strategic SWOT Matrix
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {activeOption.name}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                Internal organizational factors versus external environment forces.
              </p>
            </div>

            {/* 2x2 Quadrant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    Strengths (Internal)
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">S</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-700">
                  {activeOption.swot.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    Weaknesses (Internal)
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">W</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-700">
                  {activeOption.swot.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    Opportunities (External)
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">O</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-700">
                  {activeOption.swot.opportunities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-200">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    Threats (External)
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">T</span>
                </div>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-700">
                  {activeOption.swot.threats.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Launch Banner */}
      <div className="mt-10 p-6 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Group Deliberation
          </div>
          <h3 className="text-sm sm:text-base font-medium text-zinc-900 mt-0.5">
            Making this decision with colleagues, co-founders, or family?
          </h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            Launch a collaborative voting ballot to collect rankings, surface hidden disagreements, and break any tie.
          </p>
        </div>

        <button
          onClick={() => onLaunchGroupRoom(decision)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors shadow-xs"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Launch Group Voting Ballot</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </div>
  );
};
