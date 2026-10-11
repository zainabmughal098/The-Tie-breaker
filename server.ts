import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import type { CollaborativeRoom, VoterBallot, RoomArgument, MediatorReport } from './src/types/decision.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Collaborative Rooms Store
const rooms = new Map<string, CollaborativeRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// -----------------------------------------------------------------------------
// AI Endpoints
// -----------------------------------------------------------------------------

// Comprehensive Decision Analysis
app.post('/api/decisions/analyze', async (req, res) => {
  try {
    const { title, context, options: rawOptions, category } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'A decision question or title is required.' });
    }

    const prompt = `
You are the master analyst behind "The Tiebreaker", an elite decision engine designed to eliminate decision paralysis and deliver clear, rigorous, and actionable clarity.

Decision to analyze:
Title: "${title.trim()}"
Context / Background / Constraints: "${context ? context.trim() : 'No extra context provided'}"
Category: "${category || 'general'}"
Provided Options (if any): ${Array.isArray(rawOptions) && rawOptions.length > 0 ? JSON.stringify(rawOptions) : 'None provided. Infer 2 to 3 the most plausible, realistic, and distinct options for this dilemma.'}

Perform an exhaustive, multi-dimensional evaluation:
1. Identify 2 to 4 distinct options (use the provided ones if given, refining their names and summaries).
2. For EACH option, provide:
   - A concise summary
   - 3 to 5 realistic Pros with impact ratings (minor, moderate, major, critical), weight (1-5), and brief explanation.
   - 3 to 5 realistic Cons with impact ratings (minor, moderate, major, critical), weight (1-5), brief explanation, and an actionable MITIGATION strategy.
   - A complete SWOT analysis: 3 Strengths, 3 Weaknesses, 3 Opportunities, 3 Threats.
3. Define 4 to 6 key comparison criteria (e.g. Financial Cost/Upside, Time & Effort, Stress & Risk, Long-Term Strategic Value, Flexibility/Optionality).
   - Rate each option on these criteria from 1 to 10 with a short justification.
4. "The Tiebreaker Verdict":
   - An unambiguous winner recommendation (recommendedOptionId matching one of the options)
   - A bold headline
   - A synthesis summary explaining why this choice edges out the others
   - A confidence score between 60 and 96
   - The core trade-off (the fundamental dilemma being balanced)
   - 2 to 3 "Blind Spots" (counter-intuitive risks or hidden traps most people ignore)
   - 2 to 3 conditional paths ("Choose Option A if...", "Choose Option B if...")
   - A provocative "Gut-Check Question" designed to bypass analytical paralysis and unlock emotional truth.

Return strictly valid JSON conforming to the requested schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  pros: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        impact: { type: Type.STRING },
                        weight: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                      },
                      required: ['id', 'text', 'impact', 'weight'],
                    },
                  },
                  cons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        impact: { type: Type.STRING },
                        weight: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                        mitigation: { type: Type.STRING },
                      },
                      required: ['id', 'text', 'impact', 'weight', 'mitigation'],
                    },
                  },
                  swot: {
                    type: Type.OBJECT,
                    properties: {
                      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                      opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                      threats: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['strengths', 'weaknesses', 'opportunities', 'threats'],
                  },
                  criteriaScores: {
                    type: Type.OBJECT,
                    description: 'Scores indexed by criterion id',
                  },
                },
                required: ['id', 'name', 'description', 'pros', 'cons', 'swot'],
              },
            },
            criteria: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  weight: { type: Type.INTEGER },
                },
                required: ['id', 'name', 'description', 'weight'],
              },
            },
            verdict: {
              type: Type.OBJECT,
              properties: {
                recommendedOptionId: { type: Type.STRING },
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                confidenceScore: { type: Type.INTEGER },
                coreTradeoff: { type: Type.STRING },
                blindSpots: { type: Type.ARRAY, items: { type: Type.STRING } },
                conditionalGuidance: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      condition: { type: Type.STRING },
                      recommendedOptionId: { type: Type.STRING },
                      advice: { type: Type.STRING },
                    },
                    required: ['condition', 'recommendedOptionId', 'advice'],
                  },
                },
                gutCheckQuestion: { type: Type.STRING },
              },
              required: [
                'recommendedOptionId',
                'headline',
                'summary',
                'confidenceScore',
                'coreTradeoff',
                'blindSpots',
                'conditionalGuidance',
                'gutCheckQuestion',
              ],
            },
          },
          required: ['options', 'criteria', 'verdict'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response text received from model.');
    }

    const parsed = JSON.parse(text);

    // Build unique IDs and ensure normalized structure
    const analysisId = 'dec_' + Date.now();
    const criteriaList = (parsed.criteria || []).map((c: any, idx: number) => ({
      id: c.id || `crit_${idx + 1}`,
      name: c.name || `Criterion ${idx + 1}`,
      description: c.description || '',
      weight: Number(c.weight) || 5,
    }));

    const optionsList = (parsed.options || []).map((opt: any, optIdx: number) => {
      const optId = opt.id || `opt_${optIdx + 1}`;
      
      // Normalize criteria scores
      const normalizedScores: Record<string, { score: number; comment: string }> = {};
      criteriaList.forEach((crit: any) => {
        const rawScoreObj = opt.criteriaScores?.[crit.id] || opt.criteriaScores?.[crit.name];
        if (typeof rawScoreObj === 'number') {
          normalizedScores[crit.id] = { score: Math.max(1, Math.min(10, rawScoreObj)), comment: 'Evaluated' };
        } else if (rawScoreObj && typeof rawScoreObj === 'object') {
          normalizedScores[crit.id] = {
            score: Math.max(1, Math.min(10, Number(rawScoreObj.score) || 7)),
            comment: rawScoreObj.comment || rawScoreObj.justification || 'Evaluated',
          };
        } else {
          // fallback sensible score based on position
          normalizedScores[crit.id] = { score: 7, comment: 'Solid balance' };
        }
      });

      return {
        id: optId,
        name: opt.name || `Option ${optIdx + 1}`,
        description: opt.description || '',
        pros: (opt.pros || []).map((p: any, pIdx: number) => ({
          id: p.id || `pro_${optId}_${pIdx + 1}`,
          text: p.text || 'Advantage',
          impact: ['minor', 'moderate', 'major', 'critical'].includes(p.impact) ? p.impact : 'moderate',
          weight: Math.max(1, Math.min(5, Number(p.weight) || 3)),
          explanation: p.explanation || '',
        })),
        cons: (opt.cons || []).map((c: any, cIdx: number) => ({
          id: c.id || `con_${optId}_${cIdx + 1}`,
          text: c.text || 'Disadvantage',
          impact: ['minor', 'moderate', 'major', 'critical'].includes(c.impact) ? c.impact : 'moderate',
          weight: Math.max(1, Math.min(5, Number(c.weight) || 3)),
          explanation: c.explanation || '',
          mitigation: c.mitigation || 'Monitor and plan ahead to minimize impact.',
        })),
        swot: {
          strengths: Array.isArray(opt.swot?.strengths) ? opt.swot.strengths : [],
          weaknesses: Array.isArray(opt.swot?.weaknesses) ? opt.swot.weaknesses : [],
          opportunities: Array.isArray(opt.swot?.opportunities) ? opt.swot.opportunities : [],
          threats: Array.isArray(opt.swot?.threats) ? opt.swot.threats : [],
        },
        criteriaScores: normalizedScores,
      };
    });

    // Make sure recommendedOptionId points to an existing option
    let recId = parsed.verdict?.recommendedOptionId;
    if (!optionsList.some((o: any) => o.id === recId) && optionsList.length > 0) {
      recId = optionsList[0].id;
    }

    const fullAnalysis = {
      id: analysisId,
      title: title.trim(),
      context: context ? context.trim() : '',
      category: parsed.category || category || 'general',
      createdAt: new Date().toISOString(),
      options: optionsList,
      criteria: criteriaList,
      verdict: {
        recommendedOptionId: recId,
        headline: parsed.verdict?.headline || 'The Decisive Move',
        summary: parsed.verdict?.summary || 'Based on multi-variable analysis.',
        confidenceScore: Math.max(50, Math.min(98, Number(parsed.verdict?.confidenceScore) || 82)),
        coreTradeoff: parsed.verdict?.coreTradeoff || 'Immediate certainty vs long-term upside.',
        blindSpots: Array.isArray(parsed.verdict?.blindSpots) ? parsed.verdict.blindSpots : [],
        conditionalGuidance: Array.isArray(parsed.verdict?.conditionalGuidance) ? parsed.verdict.conditionalGuidance : [],
        gutCheckQuestion: parsed.verdict?.gutCheckQuestion || 'If a coin flip forced your hand right now, which outcome would make you secretly sigh in relief?',
      },
    };

    return res.json(fullAnalysis);
  } catch (error: any) {
    console.error('Error analyzing decision:', error);
    return res.status(500).json({
      error: 'Failed to analyze decision with AI.',
      details: error?.message || String(error),
    });
  }
});

// Group Tiebreaker AI Mediator
app.post('/api/rooms/:id/ai-mediator', async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.votes.length === 0) {
      return res.status(400).json({ error: 'At least one ballot must be submitted before invoking the AI Mediator.' });
    }

    const prompt = `
You are the neutral, high-EQ mediator for "The Tiebreaker". A team or group has submitted votes and arguments on a dilemma and is seeking an objective mediator to break deadlocks, resolve friction, and find consensus.

Decision Context:
Title: "${room.title}"
Context: "${room.context || 'None'}"
Options Available:
${JSON.stringify(room.options, null, 2)}

Ballots Cast (${room.votes.length} participants):
${JSON.stringify(room.votes, null, 2)}

Arguments & Comments Submitted by Group Members:
${JSON.stringify(room.arguments, null, 2)}

Your task as the Mediator:
1. Assess group alignment: Is the room "deadlocked" (even split), "polarized" (strong conflicting camps), or "consensus" (clear majority but minority concerns)?
2. Provide a bold Mediator Headline.
3. Deliver a clear, decisive Tiebreaker Recommendation. If there is a tie or split, explain how to break it cleanly.
4. Propose an intelligent "Compromise / Hybrid Path" that honors the valid concerns of minority voters without stalling momentum.
5. Provide a rationale and a transparent breakdown of the conflicting priorities that drove the vote differences.

Return strictly valid JSON conforming to the requested schema.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: 'deadlocked | consensus | polarized' },
            headline: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            compromiseIdea: { type: Type.STRING },
            rationale: { type: Type.STRING },
            breakdown: { type: Type.STRING },
          },
          required: ['status', 'headline', 'recommendation', 'rationale', 'breakdown'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No mediator response generated.');

    const parsed = JSON.parse(text);
    const mediatorReport: MediatorReport = {
      status: ['deadlocked', 'consensus', 'polarized'].includes(parsed.status) ? parsed.status : 'deadlocked',
      headline: parsed.headline || 'The Mediator Verdict',
      recommendation: parsed.recommendation || 'Proceed with option balancing consensus and speed.',
      compromiseIdea: parsed.compromiseIdea || undefined,
      rationale: parsed.rationale || 'Synthesized across voter preferences.',
      breakdown: parsed.breakdown || '',
      generatedAt: new Date().toISOString(),
    };

    room.aiMediatorReport = mediatorReport;
    rooms.set(roomId, room);

    return res.json(mediatorReport);
  } catch (error: any) {
    console.error('Error generating mediator report:', error);
    return res.status(500).json({ error: 'Failed to mediate room.', details: error?.message });
  }
});

// -----------------------------------------------------------------------------
// Collaborative Rooms API
// -----------------------------------------------------------------------------

// Create a Room
app.post('/api/rooms', (req, res) => {
  const { title, context, options, votingMethod, sourceDecisionId } = req.body;

  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Title and at least 2 options are required.' });
  }

  const roomId = 'room_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const code = generateRoomCode();

  const newRoom: CollaborativeRoom = {
    id: roomId,
    code,
    title: title.trim(),
    context: context ? context.trim() : '',
    options: options.map((opt: any, idx: number) => ({
      id: opt.id || `opt_${idx + 1}`,
      name: opt.name || `Option ${idx + 1}`,
      description: opt.description || '',
    })),
    votingMethod: ['ranked', 'score', 'budget'].includes(votingMethod) ? votingMethod : 'ranked',
    createdAt: new Date().toISOString(),
    votes: [],
    arguments: [],
    sourceDecisionId,
  };

  rooms.set(roomId, newRoom);
  return res.status(201).json(newRoom);
});

// Get Room by ID or Code
app.get('/api/rooms/:idOrCode', (req, res) => {
  const query = req.params.idOrCode.toUpperCase();
  let foundRoom = rooms.get(req.params.idOrCode);

  if (!foundRoom) {
    for (const room of rooms.values()) {
      if (room.code === query || room.id === req.params.idOrCode) {
        foundRoom = room;
        break;
      }
    }
  }

  if (!foundRoom) {
    return res.status(404).json({ error: 'Room not found. Check the room code.' });
  }

  return res.json(foundRoom);
});

// Cast or update a vote in a Room
app.post('/api/rooms/:id/vote', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const { voterName, voterRole, voterId, rankings, scores, budget, comment } = req.body;
  if (!voterName || !voterName.trim()) {
    return res.status(400).json({ error: 'Participant name is required.' });
  }

  const effectiveVoterId = voterId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  
  // Update existing vote or append new one
  const existingIndex = room.votes.findIndex((v) => v.voterId === effectiveVoterId);

  const ballot: VoterBallot = {
    id: 'ballot_' + Date.now(),
    voterId: effectiveVoterId,
    voterName: voterName.trim(),
    voterRole: voterRole ? voterRole.trim() : undefined,
    submittedAt: new Date().toISOString(),
    rankings: Array.isArray(rankings) ? rankings : undefined,
    scores: typeof scores === 'object' && scores !== null ? scores : undefined,
    budget: typeof budget === 'object' && budget !== null ? budget : undefined,
    comment: comment ? comment.trim() : undefined,
  };

  if (existingIndex >= 0) {
    room.votes[existingIndex] = ballot;
  } else {
    room.votes.push(ballot);
  }

  // Clear previous mediator report if votes changed
  room.aiMediatorReport = undefined;
  rooms.set(roomId, room);

  return res.json({ success: true, ballot, room });
});

// Post an argument or comment to the room
app.post('/api/rooms/:id/arguments', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  const { author, optionId, type, text } = req.body;
  if (!author || !text || !optionId) {
    return res.status(400).json({ error: 'Author, text, and optionId are required.' });
  }

  const newArgument: RoomArgument = {
    id: 'arg_' + Date.now() + Math.random().toString(36).substring(2, 4),
    author: author.trim(),
    optionId,
    type: ['pro', 'con', 'compromise'].includes(type) ? type : 'pro',
    text: text.trim(),
    upvotes: 0,
    createdAt: new Date().toISOString(),
  };

  room.arguments.push(newArgument);
  rooms.set(roomId, room);

  return res.status(201).json({ success: true, argument: newArgument, room });
});

// Upvote an argument
app.post('/api/rooms/:id/arguments/:argId/upvote', (req, res) => {
  const { id: roomId, argId } = req.params;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const argument = room.arguments.find((a) => a.id === argId);
  if (!argument) return res.status(404).json({ error: 'Argument not found.' });

  argument.upvotes += 1;
  rooms.set(roomId, room);
  return res.json({ success: true, argument });
});

// Simulate team/group votes (instantly creates realistic stakeholder personas)
app.post('/api/rooms/:id/simulate-voters', (req, res) => {
  const roomId = req.params.id;
  const room = rooms.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  const personas = [
    { name: 'Elena Vance', role: 'Head of Product', style: 'pragmatic' },
    { name: 'Marcus Chen', role: 'Lead Architect', style: 'technical' },
    { name: 'Sophia Reyes', role: 'Finance Director', style: 'budget' },
    { name: 'Devon Miller', role: 'Customer Success', style: 'experience' },
  ];

  const optionIds = room.options.map((o) => o.id);

  personas.forEach((persona, i) => {
    // Generate distinct rankings or scores
    const shuffled = [...optionIds];
    // Rotate options so there is a healthy disagreement/split
    if (i % 2 === 1) shuffled.reverse();
    if (i === 2 && shuffled.length >= 3) {
      const temp = shuffled[0];
      shuffled[0] = shuffled[1];
      shuffled[1] = temp;
    }

    const scores: Record<string, number> = {};
    const budget: Record<string, number> = {};
    const remainingBudget = 100;
    
    optionIds.forEach((optId, idx) => {
      // score between 5 and 10
      const rankPosition = shuffled.indexOf(optId);
      scores[optId] = Math.max(4, 10 - rankPosition * 2 - (i % 2));
      if (idx === optionIds.length - 1) {
        budget[optId] = Math.max(0, remainingBudget - Object.values(budget).reduce((a, b) => a + b, 0));
      } else {
        const slice = Math.floor(100 / optionIds.length) + (rankPosition === 0 ? 15 : -5);
        budget[optId] = Math.max(10, slice);
      }
    });

    const comments = [
      `Prioritizing execution velocity and team bandwidth.`,
      `We need to protect scalability and avoid technical debt down the road.`,
      `The financial downside here is too high unless we stage the rollout carefully.`,
      `Our end-users will immediately notice the difference—keep user delight paramount.`,
    ];

    const ballot: VoterBallot = {
      id: `ballot_sim_${Date.now()}_${i}`,
      voterId: `voter_sim_${i}`,
      voterName: persona.name,
      voterRole: persona.role,
      submittedAt: new Date().toISOString(),
      rankings: shuffled,
      scores,
      budget,
      comment: comments[i % comments.length],
    };

    room.votes.push(ballot);

    // Add an argument
    room.arguments.push({
      id: `arg_sim_${Date.now()}_${i}`,
      author: persona.name,
      optionId: shuffled[0],
      type: i % 2 === 0 ? 'pro' : 'compromise',
      text: `Key consideration: ${comments[i % comments.length]}`,
      upvotes: Math.floor(Math.random() * 3) + 1,
      createdAt: new Date().toISOString(),
    });
  });

  room.aiMediatorReport = undefined;
  rooms.set(roomId, room);

  return res.json({ success: true, count: personas.length, room });
});

// -----------------------------------------------------------------------------
// Dev & Production Server Mounting
// -----------------------------------------------------------------------------

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Tiebreaker server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
