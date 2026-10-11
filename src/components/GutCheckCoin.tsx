import React, { useState } from 'react';
import { Disc3, RotateCw, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GutCheckCoinProps {
  defaultOptionA?: string;
  defaultOptionB?: string;
  onDecisionChosen?: (choice: string) => void;
}

export const GutCheckCoin: React.FC<GutCheckCoinProps> = ({
  defaultOptionA = 'Option A',
  defaultOptionB = 'Option B',
  onDecisionChosen,
}) => {
  const [optionA, setOptionA] = useState(defaultOptionA);
  const [optionB, setOptionB] = useState(defaultOptionB);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipCount, setFlipCount] = useState(0);

  const handleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setResult(null);

    // Randomize outcome
    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      setResult(outcome);
      setIsFlipping(false);
      setFlipCount((prev) => prev + 1);

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });
    }, 1400);
  };

  const winningChoice = result === 'heads' ? optionA : optionB;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 shadow-xs text-center">
        {/* Intro */}
        <div className="mb-6">
          <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto mb-3">
            <Disc3 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900">
            The Psychological Gut-Check Coin
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-md mx-auto leading-relaxed">
            When logic leads to analysis paralysis, flip the digital tiebreaker coin.
            Pay ruthless attention to what your body feels while it spins.
          </p>
        </div>

        {/* Inputs for Heads vs Tails */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
          <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Heads (Side 1)
            </label>
            <input
              type="text"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="e.g. Accept Job Offer"
              className="w-full text-xs sm:text-sm font-medium text-zinc-900 bg-white border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Tails (Side 2)
            </label>
            <input
              type="text"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="e.g. Decline & Stay"
              className="w-full text-xs sm:text-sm font-medium text-zinc-900 bg-white border border-zinc-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-900"
            />
          </div>
        </div>

        {/* The Animated Coin */}
        <div className="py-6 flex flex-col items-center justify-center">
          <div
            onClick={handleFlip}
            className={`w-32 h-32 rounded-full border-4 border-zinc-900 bg-zinc-900 text-white flex flex-col items-center justify-center shadow-lg cursor-pointer select-none transition-transform duration-300 hover:scale-105 active:scale-95 ${
              isFlipping ? 'animate-spin' : ''
            }`}
          >
            <div className="w-28 h-28 rounded-full border border-dashed border-zinc-400 flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-widest font-mono text-zinc-400">
                {isFlipping ? 'FLIPPING' : result ? result.toUpperCase() : 'FLIP ME'}
              </span>
              <span className="text-xl font-bold font-serif mt-0.5">
                {isFlipping ? '?' : result === 'heads' ? 'H' : result === 'tails' ? 'T' : '¢'}
              </span>
            </div>
          </div>

          <button
            onClick={handleFlip}
            disabled={isFlipping}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-xs font-medium rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFlipping ? 'animate-spin' : ''}`} />
            <span>{isFlipping ? 'Coin is Airborne...' : 'Flip the Tiebreaker Coin'}</span>
          </button>
        </div>

        {/* Psychological Insight Callout */}
        {result && (
          <div className="mt-6 pt-6 border-t border-zinc-200 text-left space-y-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                <Sparkles className="w-4 h-4 text-zinc-900" />
                <span>The Psychological Reveal</span>
              </div>
              <p className="text-sm font-medium text-zinc-900">
                The coin landed on <span className="font-bold underline">{result.toUpperCase()}</span>: {winningChoice}
              </p>
              <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
                Now answer honestly: When you saw this outcome, did you feel a slight surge of relief,
                or a sudden pang of regret? If you felt regret, your subconscious wants the opposite option ({result === 'heads' ? optionB : optionA}).
              </p>
            </div>

            {onDecisionChosen && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => onDecisionChosen(optionA)}
                  className="flex-1 py-2 px-3 text-xs font-medium border border-zinc-300 rounded-lg hover:border-zinc-900 transition-colors"
                >
                  Adopt Heads: {optionA}
                </button>
                <button
                  onClick={() => onDecisionChosen(optionB)}
                  className="flex-1 py-2 px-3 text-xs font-medium border border-zinc-300 rounded-lg hover:border-zinc-900 transition-colors"
                >
                  Adopt Tails: {optionB}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
