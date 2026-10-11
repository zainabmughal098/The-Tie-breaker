import type { CollaborativeRoom, VoterBallot } from '../types/decision.ts';

export interface OptionTally {
  optionId: string;
  optionName: string;
  totalScore: number;
  voteCount: number;
  rankPoints: number; // Borda count points
  budgetPoints: number;
  averageScore: number;
  firstPlaceVotes: number;
}

export interface GroupConsensusMetrics {
  tallies: OptionTally[];
  winnerId: string | null;
  isTied: boolean;
  tiedOptionIds: string[];
  polarizationScore: number; // 0 (complete agreement) to 100 (heavily polarized)
  totalVoters: number;
}

export function calculateRoomConsensus(room: CollaborativeRoom): GroupConsensusMetrics {
  const options = room.options;
  const votes = room.votes;

  if (!options || options.length === 0) {
    return {
      tallies: [],
      winnerId: null,
      isTied: false,
      tiedOptionIds: [],
      polarizationScore: 0,
      totalVoters: 0,
    };
  }

  const tallyMap: Record<string, OptionTally> = {};
  options.forEach((opt) => {
    tallyMap[opt.id] = {
      optionId: opt.id,
      optionName: opt.name,
      totalScore: 0,
      voteCount: 0,
      rankPoints: 0,
      budgetPoints: 0,
      averageScore: 0,
      firstPlaceVotes: 0,
    };
  });

  const totalVoters = votes.length;
  if (totalVoters === 0) {
    return {
      tallies: options.map((opt) => tallyMap[opt.id]),
      winnerId: null,
      isTied: false,
      tiedOptionIds: [],
      polarizationScore: 0,
      totalVoters: 0,
    };
  }

  // Tally each vote based on voting method
  votes.forEach((ballot) => {
    // 1. Ranked Choice / Borda
    if (ballot.rankings && ballot.rankings.length > 0) {
      const numOptions = options.length;
      ballot.rankings.forEach((optId, rankIndex) => {
        if (tallyMap[optId]) {
          // 1st place gets (numOptions), 2nd gets (numOptions - 1)...
          const points = Math.max(0, numOptions - rankIndex);
          tallyMap[optId].rankPoints += points;
          if (rankIndex === 0) {
            tallyMap[optId].firstPlaceVotes += 1;
          }
        }
      });
    }

    // 2. Score (1-10)
    if (ballot.scores) {
      Object.entries(ballot.scores).forEach(([optId, score]) => {
        if (tallyMap[optId]) {
          tallyMap[optId].totalScore += score;
          tallyMap[optId].voteCount += 1;
        }
      });
    }

    // 3. Budget (0-100)
    if (ballot.budget) {
      Object.entries(ballot.budget).forEach(([optId, points]) => {
        if (tallyMap[optId]) {
          tallyMap[optId].budgetPoints += points;
        }
      });
    }
  });

  // Calculate final aggregated score for each option based on voting method
  const tallies = Object.values(tallyMap).map((tally) => {
    let finalMetric = 0;
    if (room.votingMethod === 'ranked') {
      finalMetric = tally.rankPoints;
    } else if (room.votingMethod === 'budget') {
      finalMetric = tally.budgetPoints;
    } else {
      // score
      finalMetric = tally.voteCount > 0 ? Number((tally.totalScore / tally.voteCount).toFixed(2)) : 0;
    }

    const averageScore = tally.voteCount > 0 ? Number((tally.totalScore / tally.voteCount).toFixed(2)) : 0;

    return {
      ...tally,
      averageScore,
      totalScore: finalMetric,
    };
  });

  // Sort descending by totalScore (or ranking points / budget)
  tallies.sort((a, b) => b.totalScore - a.totalScore);

  // Check for ties
  let winnerId: string | null = null;
  let isTied = false;
  let tiedOptionIds: string[] = [];

  if (tallies.length > 0 && totalVoters > 0) {
    const highestScore = tallies[0].totalScore;
    tiedOptionIds = tallies.filter((t) => t.totalScore === highestScore).map((t) => t.optionId);

    if (tiedOptionIds.length > 1) {
      isTied = true;
      winnerId = null;
    } else {
      winnerId = tallies[0].optionId;
    }
  }

  // Calculate polarization index: variance in 1st place choices or score disparity
  let polarizationScore = 0;
  if (tallies.length >= 2 && totalVoters >= 2) {
    const topDiff = Math.abs(tallies[0].totalScore - tallies[1].totalScore);
    const maxPossible = Math.max(1, tallies[0].totalScore);
    const closenessRatio = 1 - topDiff / maxPossible; // 1 means dead tie
    polarizationScore = Math.min(100, Math.round(closenessRatio * 85 + (isTied ? 15 : 0)));
  }

  return {
    tallies,
    winnerId,
    isTied,
    tiedOptionIds,
    polarizationScore,
    totalVoters,
  };
}
