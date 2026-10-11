import React, { useState, useEffect } from 'react';
import { Header, type ActiveTab } from './components/Header.tsx';
import { DecisionForm } from './components/DecisionForm.tsx';
import { AnalysisView } from './components/AnalysisView.tsx';
import { CollaborativeRoomView } from './components/CollaborativeRoomView.tsx';
import { GutCheckCoin } from './components/GutCheckCoin.tsx';
import { DecisionVault } from './components/DecisionVault.tsx';
import { SAMPLE_DECISIONS } from './utils/sampleData.ts';
import type { DecisionAnalysis, CollaborativeRoom } from './types/decision.ts';

const STORAGE_KEY_DECISIONS = 'the_tiebreaker_saved_decisions';
const STORAGE_KEY_ROOM = 'the_tiebreaker_active_room';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');
  const [currentDecision, setCurrentDecision] = useState<DecisionAnalysis | null>(
    SAMPLE_DECISIONS[0]
  );
  const [analysisTab, setAnalysisTab] = useState<'verdict' | 'proscons' | 'matrix' | 'swot'>('proscons');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Saved Decisions list
  const [savedDecisions, setSavedDecisions] = useState<DecisionAnalysis[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DECISIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved decisions:', e);
    }
    return SAMPLE_DECISIONS;
  });

  // Collaborative Room state
  const [activeRoom, setActiveRoom] = useState<CollaborativeRoom | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROOM);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse active room:', e);
    }
    return null;
  });

  // Check URL query parameters for room code on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      fetch(`/api/rooms/${roomParam.toUpperCase()}`)
        .then((res) => res.json())
        .then((room) => {
          if (room && room.id) {
            setActiveRoom(room);
            setActiveTab('group');
          }
        })
        .catch((err) => console.error('Error loading room from URL:', err));
    }
  }, []);

  // Sync saved decisions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(savedDecisions));
    } catch (e) {
      console.warn('Storage sync failed:', e);
    }
  }, [savedDecisions]);

  // Sync active room to localStorage
  useEffect(() => {
    try {
      if (activeRoom) {
        localStorage.setItem(STORAGE_KEY_ROOM, JSON.stringify(activeRoom));
      } else {
        localStorage.removeItem(STORAGE_KEY_ROOM);
      }
    } catch (e) {
      console.warn('Room storage sync failed:', e);
    }
  }, [activeRoom]);

  // Handle Dilemma Analysis submission
  const handleAnalyzeDecision = async (payload: {
    title: string;
    context: string;
    options: string[];
    category: string;
    preferredView?: 'proscons' | 'matrix' | 'swot' | 'verdict';
  }) => {
    setIsLoading(true);
    setErrorNotice(null);

    try {
      const response = await fetch('/api/decisions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to analyze decision.');
      }

      const analyzedDecision: DecisionAnalysis = await response.json();
      setCurrentDecision(analyzedDecision);
      if (payload.preferredView) {
        setAnalysisTab(payload.preferredView);
      }
      setIsFormOpen(false);
      setActiveTab('lab');

      // Auto save to vault
      setSavedDecisions((prev) => [
        analyzedDecision,
        ...prev.filter((d) => d.id !== analyzedDecision.id),
      ]);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorNotice(err.message || 'An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  // Launch Collaborative Group Room directly from current Decision Analysis
  const handleLaunchGroupRoom = async (decision: DecisionAnalysis) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: decision.title,
          context: decision.context,
          votingMethod: 'ranked',
          options: decision.options.map((o) => ({ id: o.id, name: o.name })),
          sourceDecisionId: decision.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to launch room.');
      const newRoom: CollaborativeRoom = await response.json();
      setActiveRoom(newRoom);
      setActiveTab('group');
    } catch (err: any) {
      setErrorNotice(err.message || 'Could not launch group room.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSavedDecision = (decision: DecisionAnalysis) => {
    setCurrentDecision(decision);
    setIsFormOpen(false);
    setActiveTab('lab');
  };

  const handleDeleteDecision = (id: string) => {
    setSavedDecisions((prev) => prev.filter((d) => d.id !== id));
    if (currentDecision?.id === id) {
      const remaining = savedDecisions.filter((d) => d.id !== id);
      setCurrentDecision(remaining[0] || null);
    }
  };

  const handleNewDecisionClick = () => {
    setIsFormOpen(true);
    setActiveTab('lab');
  };

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'lab' && isFormOpen) setIsFormOpen(false);
        }}
        onNewDecision={handleNewDecisionClick}
        activeRoomCode={activeRoom?.code}
        savedCount={savedDecisions.length}
      />

      {/* Global Error Banner */}
      {errorNotice && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 text-center flex items-center justify-center gap-2">
          <span>{errorNotice}</span>
          <button
            onClick={() => setErrorNotice(null)}
            className="underline font-medium hover:text-rose-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Areas */}
      <main className="flex-1 pb-16">
        {/* TAB 1: DECISION LAB */}
        {activeTab === 'lab' && (
          <div>
            {isFormOpen || !currentDecision ? (
              <DecisionForm
                onAnalyze={handleAnalyzeDecision}
                isLoading={isLoading}
                onSelectSample={(id) => {
                  const s = SAMPLE_DECISIONS.find((d) => d.id === id);
                  if (s) {
                    setCurrentDecision(s);
                    setIsFormOpen(false);
                  }
                }}
              />
            ) : (
              <AnalysisView
                decision={currentDecision}
                initialTab={analysisTab}
                onLaunchGroupRoom={handleLaunchGroupRoom}
                onSaveDecision={(d) => {
                  setSavedDecisions((prev) => [d, ...prev.filter((item) => item.id !== d.id)]);
                }}
                onNewDecision={handleNewDecisionClick}
              />
            )}
          </div>
        )}

        {/* TAB 2: COLLABORATIVE GROUP VOTING ROOM */}
        {activeTab === 'group' && (
          <CollaborativeRoomView
            initialRoom={activeRoom}
            onRoomChange={(updatedRoom) => setActiveRoom(updatedRoom)}
          />
        )}

        {/* TAB 3: GUT-CHECK COIN FLIP */}
        {activeTab === 'coin' && (
          <GutCheckCoin
            defaultOptionA={currentDecision?.options[0]?.name || 'Option A'}
            defaultOptionB={currentDecision?.options[1]?.name || 'Option B'}
            onDecisionChosen={(choice) => {
              setActiveTab('lab');
            }}
          />
        )}

        {/* TAB 4: DECISION VAULT */}
        {activeTab === 'vault' && (
          <DecisionVault
            savedDecisions={savedDecisions}
            onSelectDecision={handleSelectSavedDecision}
            onDeleteDecision={handleDeleteDecision}
            onNewDecision={handleNewDecisionClick}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900">The Tiebreaker</span>
            <span aria-hidden="true">·</span>
            <span>Intelligent Decision Engineering</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-600">
            <span>Pros & Cons</span>
            <span aria-hidden="true">·</span>
            <span>SWOT Canvas</span>
            <span aria-hidden="true">·</span>
            <span>Decision Matrix</span>
            <span aria-hidden="true">·</span>
            <span>Consensus Voting</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
