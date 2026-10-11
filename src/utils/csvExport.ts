import type { DecisionAnalysis } from '../types/decision.ts';

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportDecisionToCSV(
  decision: DecisionAnalysis,
  criteriaWeights?: Record<string, number>
): void {
  const rows: string[] = [];

  const addRow = (...cells: any[]) => {
    rows.push(cells.map(escapeCSV).join(','));
  };

  const addBlank = () => {
    rows.push('');
  };

  const weights = criteriaWeights || {};

  // 1. Executive Summary & Verdict
  addRow('DECISION OVERVIEW & THE TIEBREAKER VERDICT');
  addRow('Field', 'Value');
  addRow('Decision Title', decision.title);
  addRow('Domain / Category', decision.category);
  addRow('Date Evaluated', new Date(decision.createdAt).toLocaleDateString());
  addRow('Context & Constraints', decision.context || 'N/A');
  addRow(
    'Recommended Winning Option',
    decision.options.find((o) => o.id === decision.verdict.recommendedOptionId)?.name ||
      'Option'
  );
  addRow('Verdict Headline', decision.verdict.headline);
  addRow('Confidence Score', `${decision.verdict.confidenceScore}%`);
  addRow('Verdict Executive Summary', decision.verdict.summary);
  addRow('Core Trade-off Dilemma', decision.verdict.coreTradeoff);
  addRow('Instinctual Gut-Check Question', decision.verdict.gutCheckQuestion);

  if (decision.verdict.blindSpots && decision.verdict.blindSpots.length > 0) {
    decision.verdict.blindSpots.forEach((spot, idx) => {
      addRow(`Blind Spot #${idx + 1}`, spot);
    });
  }

  addBlank();

  // 2. Decision Matrix & Criteria Scores
  addRow('CRITERIA COMPARISON MATRIX');
  addRow(
    'Option Name',
    'Criterion Name',
    'Criterion Weight (1-10)',
    'Score (1-10)',
    'Weighted Score Contribution',
    'Evaluation Note'
  );

  decision.options.forEach((opt) => {
    decision.criteria.forEach((crit) => {
      const weight = weights[crit.id] ?? crit.weight;
      const scoreObj = opt.criteriaScores[crit.id] || { score: 5, comment: '' };
      const score = scoreObj.score;
      const weightedContribution = Number((score * weight).toFixed(1));

      addRow(
        opt.name,
        crit.name,
        weight,
        score,
        weightedContribution,
        scoreObj.comment || ''
      );
    });
  });

  addBlank();

  // 3. Option Weighted Totals
  addRow('OPTION WEIGHTED TOTALS');
  addRow('Option Name', 'Description', 'Weighted Score (0-100)', 'Leader Status');

  decision.options.forEach((opt) => {
    let totalScore = 0;
    let totalWeight = 0;

    decision.criteria.forEach((crit) => {
      const weight = weights[crit.id] ?? crit.weight;
      const scoreObj = opt.criteriaScores[crit.id];
      const rawScore = scoreObj ? scoreObj.score : 5;
      totalScore += rawScore * weight;
      totalWeight += weight;
    });

    const indexTotal =
      totalWeight > 0 ? Number(((totalScore / (totalWeight * 10)) * 100).toFixed(1)) : 0;
    const isWinner = opt.id === decision.verdict.recommendedOptionId;

    addRow(
      opt.name,
      opt.description || '',
      `${indexTotal}%`,
      isWinner ? 'Consensus Leader' : 'Alternative'
    );
  });

  addBlank();

  // 4. Detailed Pros & Cons with Mitigations
  addRow('DETAILED PROS & CONS EVALUATION');
  addRow(
    'Option Name',
    'Type (Pro / Con)',
    'Impact Level',
    'Weight (1-5)',
    'Point / Argument',
    'Explanation',
    'Actionable Mitigation'
  );

  decision.options.forEach((opt) => {
    opt.pros.forEach((pro) => {
      addRow(
        opt.name,
        'Pro (Advantage)',
        pro.impact,
        pro.weight,
        pro.text,
        pro.explanation || '',
        'N/A'
      );
    });

    opt.cons.forEach((con) => {
      addRow(
        opt.name,
        'Con (Downside)',
        con.impact,
        con.weight,
        con.text,
        con.explanation || '',
        con.mitigation || ''
      );
    });
  });

  addBlank();

  // 5. Strategic SWOT Analysis Matrix
  addRow('STRATEGIC SWOT ANALYSIS');
  addRow('Option Name', 'SWOT Dimension', 'Strategic Factor');

  decision.options.forEach((opt) => {
    opt.swot.strengths.forEach((s) => addRow(opt.name, 'Strength (Internal)', s));
    opt.swot.weaknesses.forEach((w) => addRow(opt.name, 'Weakness (Internal)', w));
    opt.swot.opportunities.forEach((o) => addRow(opt.name, 'Opportunity (External)', o));
    opt.swot.threats.forEach((t) => addRow(opt.name, 'Threat (External)', t));
  });

  // UTF-8 BOM (\uFEFF) for Excel / Google Sheets compatibility
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = `${decision.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 35)}_tiebreaker.csv`;
  a.download = safeFilename;
  a.click();
  URL.revokeObjectURL(url);
}
