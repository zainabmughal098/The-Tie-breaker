export type ImpactLevel = 'minor' | 'moderate' | 'major' | 'critical';

export interface ProItem {
  id: string;
  text: string;
  impact: ImpactLevel;
  weight: number; // 1-5
  explanation?: string;
}

export interface ConItem {
  id: string;
  text: string;
  impact: ImpactLevel;
  weight: number; // 1-5
  explanation?: string;
  mitigation?: string;
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ComparisonCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 1 to 10
}

export interface DecisionOption {
  id: string;
  name: string;
  description: string;
  pros: ProItem[];
  cons: ConItem[];
  swot: SwotAnalysis;
  criteriaScores: Record<string, { score: number; comment: string }>; // criterionId -> score (1-10)
}

export interface ConditionalGuidance {
  condition: string;
  recommendedOptionId: string;
  advice: string;
}

export interface TheTiebreakerVerdict {
  recommendedOptionId: string;
  headline: string;
  summary: string;
  confidenceScore: number; // 0-100
  coreTradeoff: string;
  blindSpots: string[];
  conditionalGuidance: ConditionalGuidance[];
  gutCheckQuestion: string;
}

export interface DecisionAnalysis {
  id: string;
  title: string;
  context: string;
  category: 'career' | 'business' | 'finance' | 'lifestyle' | 'technology' | 'personal' | 'team';
  createdAt: string;
  options: DecisionOption[];
  criteria: ComparisonCriterion[];
  verdict: TheTiebreakerVerdict;
  notes?: string;
}

export type VotingMethod = 'ranked' | 'score' | 'budget';

export interface VoterBallot {
  id: string;
  voterId: string;
  voterName: string;
  voterRole?: string;
  submittedAt: string;
  rankings?: string[]; // option ids ranked from 1st to last
  scores?: Record<string, number>; // optionId -> 1-10
  budget?: Record<string, number>; // optionId -> allocated points (e.g. 0-100)
  comment?: string;
}

export interface RoomArgument {
  id: string;
  author: string;
  optionId: string;
  type: 'pro' | 'con' | 'compromise';
  text: string;
  upvotes: number;
  createdAt: string;
}

export interface MediatorReport {
  status: 'deadlocked' | 'consensus' | 'polarized';
  headline: string;
  recommendation: string;
  compromiseIdea?: string;
  rationale: string;
  breakdown: string;
  generatedAt: string;
}

export interface CollaborativeRoom {
  id: string;
  code: string;
  title: string;
  context: string;
  options: Array<{ id: string; name: string; description: string }>;
  votingMethod: VotingMethod;
  createdAt: string;
  votes: VoterBallot[];
  arguments: RoomArgument[];
  aiMediatorReport?: MediatorReport;
  sourceDecisionId?: string;
}
