import { jsPDF } from 'jspdf';
import type { DecisionAnalysis } from '../types/decision.ts';

export function exportDecisionToPDF(
  decision: DecisionAnalysis,
  criteriaWeights?: Record<string, number>
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (spaceNeeded: number) => {
    if (y + spaceNeeded > pageHeight - margin - 10) {
      doc.addPage();
      y = margin + 5;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('THE TIEBREAKER — DECISION EVALUATION REPORT', margin, y);
    doc.text(
      new Date(decision.createdAt).toLocaleDateString(),
      pageWidth - margin,
      y,
      { align: 'right' }
    );
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // 1. Initial Page Header
  drawHeader();

  // Category Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  doc.text(`DOMAIN: ${decision.category.toUpperCase()}`, margin, y);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27); // zinc-900
  const titleLines = doc.splitTextToSize(decision.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Context if present
  if (decision.context) {
    checkPageBreak(15);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    const contextLines = doc.splitTextToSize(`Context: ${decision.context}`, contentWidth);
    doc.text(contextLines, margin, y);
    y += contextLines.length * 4.5 + 4;
  }

  // 2. The Tiebreaker Verdict Box
  checkPageBreak(45);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);

  const verdictBoxTop = y;
  // Estimate height of summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const summaryLines = doc.splitTextToSize(decision.verdict.summary, contentWidth - 10);
  const verdictBoxHeight = 32 + summaryLines.length * 4.5;

  doc.roundedRect(margin, verdictBoxTop, contentWidth, verdictBoxHeight, 2, 2, 'FD');

  let vy = verdictBoxTop + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(
    `THE TIEBREAKER VERDICT  ·  CONFIDENCE: ${decision.verdict.confidenceScore}%`,
    margin + 5,
    vy
  );

  vy += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  const headlineLines = doc.splitTextToSize(decision.verdict.headline, contentWidth - 10);
  doc.text(headlineLines, margin + 5, vy);
  vy += headlineLines.length * 5.5 + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(summaryLines, margin + 5, vy);

  y = verdictBoxTop + verdictBoxHeight + 6;

  // Core Trade-off
  checkPageBreak(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text('Core Trade-off Dilemma:', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const tradeoffLines = doc.splitTextToSize(decision.verdict.coreTradeoff, contentWidth);
  doc.text(tradeoffLines, margin, y);
  y += tradeoffLines.length * 4.5 + 4;

  // Blind Spots
  if (decision.verdict.blindSpots && decision.verdict.blindSpots.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('Blind Spots to Watch:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    decision.verdict.blindSpots.forEach((spot) => {
      checkPageBreak(12);
      const spotLines = doc.splitTextToSize(`•  ${spot}`, contentWidth - 4);
      doc.text(spotLines, margin + 2, y);
      y += spotLines.length * 4 + 1;
    });
    y += 3;
  }

  // Conditional Guidance
  if (decision.verdict.conditionalGuidance && decision.verdict.conditionalGuidance.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text('When to Pivot (Conditional Scenarios):', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    decision.verdict.conditionalGuidance.forEach((rule) => {
      checkPageBreak(12);
      const ruleText = `• If: ${rule.condition} -> ${rule.advice}`;
      const ruleLines = doc.splitTextToSize(ruleText, contentWidth - 4);
      doc.text(ruleLines, margin + 2, y);
      y += ruleLines.length * 4 + 1;
    });
    y += 4;
  }

  // 3. Options In-Depth Analysis (Pros, Cons, Mitigations)
  checkPageBreak(25);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text('Detailed Options Evaluation', margin, y);
  y += 7;

  decision.options.forEach((opt, idx) => {
    checkPageBreak(35);
    // Option Header
    doc.setFillColor(244, 244, 245); // zinc-100
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      `Option ${String.fromCharCode(65 + idx)}: ${opt.name}`,
      margin + 3,
      y + 4.8
    );
    y += 10;

    if (opt.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      const descLines = doc.splitTextToSize(opt.description, contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 2;
    }

    // Pros Section
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`Key Advantages (${opt.pros.length}):`, margin, y);
    y += 4.5;

    opt.pros.forEach((p) => {
      checkPageBreak(12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const proText = `[+ ${p.weight}/5] ${p.text}${p.explanation ? ' — ' + p.explanation : ''}`;
      const pLines = doc.splitTextToSize(proText, contentWidth - 4);
      doc.text(pLines, margin + 3, y);
      y += pLines.length * 3.8 + 1;
    });
    y += 2;

    // Cons & Mitigations Section
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`Downsides & Mitigations (${opt.cons.length}):`, margin, y);
    y += 4.5;

    opt.cons.forEach((c) => {
      checkPageBreak(14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const conText = `[- ${c.weight}/5] ${c.text}${c.explanation ? ' — ' + c.explanation : ''}`;
      const cLines = doc.splitTextToSize(conText, contentWidth - 4);
      doc.text(cLines, margin + 3, y);
      y += cLines.length * 3.8 + 0.5;

      if (c.mitigation) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        const mitLines = doc.splitTextToSize(`   Mitigation: ${c.mitigation}`, contentWidth - 6);
        doc.text(mitLines, margin + 3, y);
        y += mitLines.length * 3.6 + 1.5;
      }
    });
    y += 3;

    // SWOT Summary for this option
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('SWOT Breakdown:', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);

    const swotLines = [
      `Strengths: ${opt.swot.strengths.join(', ')}`,
      `Weaknesses: ${opt.swot.weaknesses.join(', ')}`,
      `Opportunities: ${opt.swot.opportunities.join(', ')}`,
      `Threats: ${opt.swot.threats.join(', ')}`,
    ];

    swotLines.forEach((line) => {
      checkPageBreak(8);
      const sLines = doc.splitTextToSize(line, contentWidth - 4);
      doc.text(sLines, margin + 3, y);
      y += sLines.length * 3.4 + 0.8;
    });

    y += 5;
  });

  // 4. Instinctual Gut-Check
  if (decision.verdict.gutCheckQuestion) {
    checkPageBreak(25);
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text('THE INSTINCTUAL GUT-CHECK QUESTION:', margin + 4, y + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const gutLines = doc.splitTextToSize(`"${decision.verdict.gutCheckQuestion}"`, contentWidth - 8);
    doc.text(gutLines, margin + 4, y + 11);
    y += 24;
  }

  // Page Numbers Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `The Tiebreaker Decision Engine  ·  Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger download
  const safeFilename = `${decision.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 35)}_tiebreaker_report.pdf`;

  doc.save(safeFilename);
}
