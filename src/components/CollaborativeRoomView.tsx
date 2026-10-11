import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Vote,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  AlertOctagon,
  ArrowUpDown,
  Sliders,
  DollarSign,
  Send,
  Loader2,
  RefreshCw,
  Plus,
  Scale,
  Award,
} from 'lucide-react';
import type { CollaborativeRoom, VoterBallot, VotingMethod } from '../types/decision.ts';
import { calculateRoomConsensus } from '../utils/votingCalculator.ts';
import confetti from 'canvas-confetti';
import { VotingResultsChart } from './VotingResultsChart.tsx';

interface CollaborativeRoomViewProps {
  initialRoom?: CollaborativeRoom | null;
  onRoomChange?: (room: CollaborativeRoom) => void;
}

export const CollaborativeRoomView: React.FC<CollaborativeRoomViewProps> = ({
  initialRoom,
  onRoomChange,
}) => {
  const [currentRoom, setCurrentRoom] = useState<CollaborativeRoom | null>(initialRoom || null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // New Room Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(!initialRoom);
  const [newTitle, setNewTitle] = useState('');
  const [newContext, setNewContext] = useState('');
  const [newVotingMethod, setNewVotingMethod] = useState<VotingMethod>('ranked');
  const [newOptions, setNewOptions] = useState<string[]>(['Option A', 'Option B']);

  // Voter Ballot Form State
  const [voterName, setVoterName] = useState('');
  const [voterRole, setVoterRole] = useState('');
  const [voterComment, setVoterComment] = useState('');
  const [rankedOrder, setRankedOrder] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [budgetPoints, setBudgetPoints] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Argument Form State
  const [argAuthor, setArgAuthor] = useState('');
  const [argOptionId, setArgOptionId] = useState('');
  const [argType, setArgType] = useState<'pro' | 'con' | 'compromise'>('pro');
  const [argText, setArgText] = useState('');
  const [isSubmittingArg, setIsSubmittingArg] = useState(false);

  // Mediator State
  const [isMediating, setIsMediating] = useState(false);

  // Update room when initialRoom prop changes
  useEffect(() => {
    if (initialRoom) {
      setCurrentRoom(initialRoom);
      setShowCreateModal(false);
      initBallotForRoom(initialRoom);
    }
  }, [initialRoom]);

  const initBallotForRoom = (room: CollaborativeRoom) => {
    setRankedOrder(room.options.map((o) => o.id));
    const initScores: Record<string, number> = {};
    const initBudget: Record<string, number> = {};
    const slice = Math.floor(100 / room.options.length);

    room.options.forEach((o, i) => {
      initScores[o.id] = 7;
      initBudget[o.id] = i === room.options.length - 1 ? 100 - slice * (room.options.length - 1) : slice;
    });

    setScores(initScores);
    setBudgetPoints(initBudget);
    if (room.options[0]) {
      setArgOptionId(room.options[0].id);
    }
  };

  // Poll room updates if room is active
  useEffect(() => {
    if (!currentRoom) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoom.id}`);
        if (res.ok) {
          const updated = await res.json();
          setCurrentRoom(updated);
          if (onRoomChange) onRoomChange(updated);
        }
      } catch (err) {
        // silent fail on poll
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentRoom?.id]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const validOptions = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) {
      setErrorMsg('Please specify at least 2 distinct options.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          context: newContext.trim(),
          votingMethod: newVotingMethod,
          options: validOptions.map((name, i) => ({ id: `opt_${i + 1}`, name })),
        }),
      });

      if (!res.ok) throw new Error('Failed to create room.');
      const room = await res.json();
      setCurrentRoom(room);
      setShowCreateModal(false);
      initBallotForRoom(room);
      if (onRoomChange) onRoomChange(room);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating collaborative room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/rooms/${roomCodeInput.trim().toUpperCase()}`);
      if (!res.ok) {
        throw new Error('Room not found. Please check your room code.');
      }
      const room = await res.json();
      setCurrentRoom(room);
      setShowCreateModal(false);
      initBallotForRoom(room);
      if (onRoomChange) onRoomChange(room);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not join room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateVoters = async () => {
    if (!currentRoom) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rooms/${currentRoom.id}/simulate-voters`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data.room);
        if (onRoomChange) onRoomChange(data.room);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !voterName.trim()) return;

    setIsSubmittingVote(true);
    try {
      const res = await fetch(`/api/rooms/${currentRoom.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: voterName.trim(),
          voterRole: voterRole.trim() || undefined,
          rankings: currentRoom.votingMethod === 'ranked' ? rankedOrder : undefined,
          scores: currentRoom.votingMethod === 'score' ? scores : undefined,
          budget: currentRoom.votingMethod === 'budget' ? budgetPoints : undefined,
          comment: voterComment.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit vote.');
      const data = await res.json();
      setCurrentRoom(data.room);
      setHasVoted(true);
      if (onRoomChange) onRoomChange(data.room);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting vote');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleAddArgument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !argAuthor.trim() || !argText.trim()) return;

    setIsSubmittingArg(true);
    try {
      const res = await fetch(`/api/rooms/${currentRoom.id}/arguments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: argAuthor.trim(),
          optionId: argOptionId,
          type: argType,
          text: argText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data.room);
        setArgText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingArg(false);
    }
  };

  const handleUpvoteArg = async (argId: string) => {
    if (!currentRoom) return;
    try {
      await fetch(`/api/rooms/${currentRoom.id}/arguments/${argId}/upvote`, {
        method: 'POST',
      });
      // update local
      const updatedArgs = currentRoom.arguments.map((a) =>
        a.id === argId ? { ...a, upvotes: a.upvotes + 1 } : a
      );
      setCurrentRoom({ ...currentRoom, arguments: updatedArgs });
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvokeMediator = async () => {
    if (!currentRoom) return;
    setIsMediating(true);
    try {
      const res = await fetch(`/api/rooms/${currentRoom.id}/ai-mediator`, {
        method: 'POST',
      });
      if (res.ok) {
        const report = await res.json();
        setCurrentRoom({ ...currentRoom, aiMediatorReport: report });
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMediating(false);
    }
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    if (!currentRoom) return;
    const url = `${window.location.origin}/?room=${currentRoom.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Rank Reorder Helpers
  const moveRank = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rankedOrder.length) return;
    const updated = [...rankedOrder];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setRankedOrder(updated);
  };

  const consensus = currentRoom ? calculateRoomConsensus(currentRoom) : null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* ----------------- ROOM CREATION / JOIN STATE ----------------- */}
      {showCreateModal && !currentRoom && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Collaborative Group Voting Room
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1">
              Create a shared decision room or join an existing session to collect ballots and resolve deadlocks.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Join with Code */}
          <form onSubmit={handleJoinRoom} className="mb-8 pb-8 border-b border-zinc-200">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
              Have a Room Code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. TIE42"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                className="flex-1 px-3.5 py-2 text-sm uppercase font-mono tracking-widest text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={isLoading || !roomCodeInput.trim()}
                className="px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors cursor-pointer"
              >
                Join Room
              </button>
            </div>
          </form>

          {/* Create New Room */}
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Or Start a New Group Decision
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Dilemma / Decision Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Which Q3 Strategic Goal Should the Team Prioritize?"
                required
                className="w-full px-3.5 py-2 text-sm text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Voting Model
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewVotingMethod('ranked')}
                  className={`p-2.5 text-left border rounded-lg text-xs transition-colors ${
                    newVotingMethod === 'ranked'
                      ? 'border-zinc-900 bg-zinc-50 font-medium text-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-semibold">Ranked Choice</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Borda count preference</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewVotingMethod('score')}
                  className={`p-2.5 text-left border rounded-lg text-xs transition-colors ${
                    newVotingMethod === 'score'
                      ? 'border-zinc-900 bg-zinc-50 font-medium text-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-semibold">1-10 Rating</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Independent scores</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewVotingMethod('budget')}
                  className={`p-2.5 text-left border rounded-lg text-xs transition-colors ${
                    newVotingMethod === 'budget'
                      ? 'border-zinc-900 bg-zinc-50 font-medium text-zinc-900'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-semibold">100-Pt Budget</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Chips allocation</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Options to Vote On
              </label>
              <div className="space-y-2">
                {newOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...newOptions];
                      updated[i] = e.target.value;
                      setNewOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full px-3.5 py-1.5 text-xs text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  />
                ))}
              </div>
              {newOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setNewOptions([...newOptions, `Option ${newOptions.length + 1}`])}
                  className="mt-2 text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add option</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !newTitle.trim()}
              className="w-full py-2.5 px-4 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors shadow-xs"
            >
              {isLoading ? 'Creating Room...' : 'Open Decision Room'}
            </button>
          </form>
        </div>
      )}

      {/* ----------------- ACTIVE ROOM INTERFACE ----------------- */}
      {currentRoom && (
        <div className="space-y-8">
          {/* Room Header & Invite Toolbar */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                  <span className="font-mono text-zinc-900 font-semibold bg-zinc-100 px-2 py-0.5 rounded">
                    ROOM: {currentRoom.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{currentRoom.votingMethod} Method</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentRoom.votes.length} Ballots Cast</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
                  {currentRoom.title}
                </h1>
                {currentRoom.context && (
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-2xl">
                    {currentRoom.context}
                  </p>
                )}
              </div>

              {/* Actions & Code Sharing */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200 rounded-lg transition-colors"
                  title="Copy 5-character room code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : `Code: ${currentRoom.code}`}</span>
                </button>

                <button
                  onClick={copyRoomLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-zinc-300 text-zinc-700 hover:text-zinc-900 rounded-lg transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Users className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
                </button>

                <button
                  onClick={handleSimulateVoters}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors shadow-xs"
                  title="Instantly generate realistic votes from 4 diverse team personas"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate Team Votes</span>
                </button>
              </div>
            </div>

            {/* Live Consensus Tally Dashboard */}
            {consensus && currentRoom.votes.length > 0 && (
              <div className="mt-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-zinc-700" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                      Live Group Consensus
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-500">
                      Polarization Index:{' '}
                      <span className={`font-mono font-semibold ${
                        consensus.polarizationScore > 50 ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {consensus.polarizationScore}%
                      </span>
                    </span>

                    {consensus.isTied && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-[11px]">
                        Deadlock Detected
                      </span>
                    )}
                  </div>
                </div>

                {/* Real-time Recharts Bar Chart Visualization */}
                <VotingResultsChart room={currentRoom} consensus={consensus} />

                {/* Consensus Ranking Bars */}
                <div className="space-y-3">
                  {consensus.tallies.map((tally, rankIdx) => {
                    const isWinner = tally.optionId === consensus.winnerId;
                    const maxScore = consensus.tallies[0]?.totalScore || 1;
                    const percent = maxScore > 0 ? (tally.totalScore / maxScore) * 100 : 0;

                    return (
                      <div
                        key={tally.optionId}
                        className={`p-3 rounded-lg border transition-all ${
                          isWinner
                            ? 'border-zinc-900 bg-zinc-50/70 shadow-xs'
                            : 'border-zinc-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-zinc-400 w-5">
                              #{rankIdx + 1}
                            </span>
                            <span className="font-medium text-zinc-900">
                              {tally.optionName}
                            </span>
                            {isWinner && (
                              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                                Majority Choice
                              </span>
                            )}
                          </div>

                          <div className="font-mono text-xs text-zinc-700 flex items-center gap-2">
                            <span>
                              {currentRoom.votingMethod === 'ranked' && `${tally.rankPoints} pts (Borda)`}
                              {currentRoom.votingMethod === 'score' && `${tally.averageScore}/10 avg`}
                              {currentRoom.votingMethod === 'budget' && `${tally.budgetPoints} allocated pts`}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isWinner ? 'bg-zinc-900' : 'bg-zinc-400'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Deadlock Tiebreaker Mediator Callout */}
                <div className="mt-6 p-4 rounded-xl bg-zinc-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      The Tiebreaker AI Mediator
                    </div>
                    <div className="text-sm font-medium mt-0.5">
                      {consensus.isTied
                        ? 'The room is tied! Let AI analyze conflicting priorities and break the deadlock.'
                        : 'Uncover why minority voters disagreed and synthesize a hybrid compromise.'}
                    </div>
                  </div>

                  <button
                    onClick={handleInvokeMediator}
                    disabled={isMediating}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors shadow-xs"
                  >
                    {isMediating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mediating Ballots...</span>
                      </>
                    ) : (
                      <>
                        <Scale className="w-3.5 h-3.5" />
                        <span>Break Deadlock with AI Mediator</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Mediator Report Display (if generated) */}
          {currentRoom.aiMediatorReport && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  <Scale className="w-4 h-4 text-zinc-900" />
                  <span>Mediator Resolution Report</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize text-zinc-500">
                    Status: {currentRoom.aiMediatorReport.status}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {new Date(currentRoom.aiMediatorReport.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-zinc-900">
                {currentRoom.aiMediatorReport.headline}
              </h3>

              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-800 leading-relaxed">
                <div className="font-semibold text-zinc-900 mb-1">
                  Tiebreaker Recommendation:
                </div>
                {currentRoom.aiMediatorReport.recommendation}
              </div>

              {currentRoom.aiMediatorReport.compromiseIdea && (
                <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-xs sm:text-sm text-emerald-950 leading-relaxed">
                  <div className="font-semibold text-emerald-900 mb-1">
                    Compromise / Hybrid Path:
                  </div>
                  {currentRoom.aiMediatorReport.compromiseIdea}
                </div>
              )}

              <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-800">Priority Breakdown: </span>
                {currentRoom.aiMediatorReport.breakdown}
              </div>
            </div>
          )}

          {/* Two-Column Grid: Cast Ballot & Argument Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Cast Ballot Form */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-zinc-700" />
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {hasVoted ? 'Update Your Ballot' : 'Cast Your Ballot'}
                  </h3>
                </div>
                {hasVoted && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Vote Recorded
                  </span>
                )}
              </div>

              <form onSubmit={handleCastVote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={voterName}
                      onChange={(e) => setVoterName(e.target.value)}
                      placeholder="e.g. Jordan Smith"
                      className="w-full px-3 py-2 text-xs text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Perspective / Role <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={voterRole}
                      onChange={(e) => setVoterRole(e.target.value)}
                      placeholder="e.g. Engineering, Finance, Co-founder"
                      className="w-full px-3 py-2 text-xs text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                    />
                  </div>
                </div>

                {/* Ballot Input per Voting Method */}
                <div className="pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-2">
                    {currentRoom.votingMethod === 'ranked' && 'Order Preferences (1st to Last)'}
                    {currentRoom.votingMethod === 'score' && 'Rate Each Option (1 to 10)'}
                    {currentRoom.votingMethod === 'budget' && 'Allocate 100 Points Across Options'}
                  </div>

                  {/* RANKED CHOICE REORDER */}
                  {currentRoom.votingMethod === 'ranked' && (
                    <div className="space-y-2">
                      {rankedOrder.map((optId, index) => {
                        const opt = currentRoom.options.find((o) => o.id === optId);
                        return (
                          <div
                            key={optId}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-center font-mono font-bold text-zinc-500">
                                {index + 1}.
                              </span>
                              <span className="font-medium text-zinc-900">
                                {opt?.name || optId}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveRank(index, index - 1)}
                                className="px-2 py-1 text-[11px] font-mono border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={index === rankedOrder.length - 1}
                                onClick={() => moveRank(index, index + 1)}
                                className="px-2 py-1 text-[11px] font-mono border border-zinc-200 rounded hover:bg-zinc-100 disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SCORE RATING */}
                  {currentRoom.votingMethod === 'score' && (
                    <div className="space-y-3">
                      {currentRoom.options.map((opt) => (
                        <div key={opt.id} className="p-2.5 rounded-lg border border-zinc-200">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-zinc-900">{opt.name}</span>
                            <span className="font-mono font-bold text-zinc-700">
                              {scores[opt.id] || 5}/10
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={scores[opt.id] || 5}
                            onChange={(e) =>
                              setScores({ ...scores, [opt.id]: Number(e.target.value) })
                            }
                            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 100-POINT BUDGET */}
                  {currentRoom.votingMethod === 'budget' && (
                    <div className="space-y-3">
                      {currentRoom.options.map((opt) => (
                        <div key={opt.id} className="p-2.5 rounded-lg border border-zinc-200">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-zinc-900">{opt.name}</span>
                            <span className="font-mono font-bold text-zinc-700">
                              {budgetPoints[opt.id] || 0} pts
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={budgetPoints[opt.id] || 0}
                            onChange={(e) =>
                              setBudgetPoints({ ...budgetPoints, [opt.id]: Number(e.target.value) })
                            }
                            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                        </div>
                      ))}
                      <div className="text-right text-[11px] font-mono text-zinc-500">
                        Total Allocated: {Object.values(budgetPoints).reduce((a, b) => a + b, 0)}/100 pts
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Your Rationale or Key Consideration <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={voterComment}
                    onChange={(e) => setVoterComment(e.target.value)}
                    placeholder="Why did you rank or score the options this way?"
                    className="w-full px-3 py-2 text-xs text-zinc-900 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingVote || !voterName.trim()}
                  className="w-full py-2.5 px-4 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors shadow-xs"
                >
                  {isSubmittingVote ? 'Submitting Ballot...' : hasVoted ? 'Update Ballot' : 'Submit My Ballot'}
                </button>
              </form>
            </div>

            {/* 2. Group Arguments & Insights Feed */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-700" />
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Arguments & Perspectives ({currentRoom.arguments.length})
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {currentRoom.arguments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400">
                      No arguments posted yet. Add a pro, con, or compromise idea below!
                    </div>
                  ) : (
                    currentRoom.arguments.map((arg) => {
                      const opt = currentRoom.options.find((o) => o.id === arg.optionId);
                      return (
                        <div
                          key={arg.id}
                          className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/40 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-zinc-600">
                              <span className="font-semibold text-zinc-900">{arg.author}</span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize text-[11px] font-medium text-zinc-500">
                                {arg.type} for {opt?.name || 'Option'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUpvoteArg(arg.id)}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-zinc-200 bg-white hover:bg-zinc-100 text-[11px] text-zinc-600"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{arg.upvotes}</span>
                            </button>
                          </div>

                          <p className="text-zinc-800 leading-relaxed">{arg.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Argument Form */}
              <form onSubmit={handleAddArgument} className="mt-4 pt-4 border-t border-zinc-100 space-y-2.5">
                <div className="text-xs font-semibold text-zinc-700">Add an Argument</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={argAuthor}
                    onChange={(e) => setArgAuthor(e.target.value)}
                    className="col-span-1 px-2.5 py-1.5 text-xs text-zinc-900 border border-zinc-300 rounded-lg"
                  />

                  <select
                    value={argOptionId}
                    onChange={(e) => setArgOptionId(e.target.value)}
                    className="col-span-1 px-2.5 py-1.5 text-xs text-zinc-900 border border-zinc-300 rounded-lg bg-white"
                  >
                    {currentRoom.options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={argType}
                    onChange={(e) => setArgType(e.target.value as any)}
                    className="col-span-1 px-2.5 py-1.5 text-xs text-zinc-900 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="pro">Pro Argument</option>
                    <option value="con">Con / Concern</option>
                    <option value="compromise">Compromise</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={argText}
                    onChange={(e) => setArgText(e.target.value)}
                    placeholder="Enter your argument or proposed compromise..."
                    className="flex-1 px-3 py-1.5 text-xs text-zinc-900 border border-zinc-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingArg || !argAuthor.trim() || !argText.trim()}
                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
