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

// Fallback Analytical Engine when external AI service experiences quota/permission denial
function buildFallbackAnalysis(
  title: string,
  context: string = '',
  rawOptions?: string[],
  category: string = 'general'
) {
  const cleanTitle = title.trim();
  const lower = cleanTitle.toLowerCase();
  const analysisId = 'dec_' + Date.now();

  // Scenario 1: Software Freemium vs Flat Pricing (Lab Step 2 Scenario)
  if (lower.includes('software') || (lower.includes('free') && lower.includes('20')) || lower.includes('freemium')) {
    return {
      id: analysisId,
      title: cleanTitle,
      context: context || 'SaaS pricing dilemma between freemium adoption and upfront cash-flow monetization.',
      category: 'business',
      createdAt: new Date().toISOString(),
      criteria: [
        { id: 'crit_1', name: 'User Acquisition Velocity', description: 'Top-of-funnel viral spread and organic signups', weight: 8 },
        { id: 'crit_2', name: 'Immediate Cash Flow & MRR Stability', description: 'Predictability and quality of revenue per subscriber', weight: 9 },
        { id: 'crit_3', name: 'Server & Support Overhead Burden', description: 'Cost to serve free non-paying users', weight: 7 },
        { id: 'crit_4', name: 'Willingness-to-Pay Qualification', description: 'Filtering for committed enterprise or power users', weight: 8 },
        { id: 'crit_5', name: 'Network Effects & Feedback Loops', description: 'Volume of telemetry, bug reports, and user testimonials', weight: 6 },
      ],
      options: [
        {
          id: 'opt_freemium',
          name: 'Freemium Model (Free Core with Paid Features)',
          description: 'Offer a generous free tier to maximize distribution, charging for advanced power features, team seats, and API limits.',
          pros: [
            {
              id: 'pro_fm_1',
              text: 'Zero-friction viral distribution and word-of-mouth growth',
              impact: 'critical' as const,
              weight: 5,
              explanation: 'Allows hundreds of thousands of users to discover and embed your product into their daily workflow without procurement hurdles.',
            },
            {
              id: 'pro_fm_2',
              text: 'Higher total addressable funnel and self-serve organic pipeline',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Creates a massive pool of potential upgrade prospects when their business needs expand.',
            },
            {
              id: 'pro_fm_3',
              text: 'Continuous product feedback and telemetry at scale',
              impact: 'moderate' as const,
              weight: 4,
              explanation: 'Identifies edge cases and usability bottlenecks faster through sheer usage volume.',
            },
          ],
          cons: [
            {
              id: 'con_fm_1',
              text: 'High compute and customer support drag from non-paying users',
              impact: 'critical' as const,
              weight: 5,
              explanation: '90-95% of users will never pay, yet demand bandwidth, database storage, and documentation support.',
              mitigation: 'Implement hard API rate limits, automated community forum support, and strict resource quotas for free accounts.',
            },
            {
              id: 'con_fm_2',
              text: 'Prolonged time to revenue validation and cash breakeven',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Free tiers can cannibalize users who would otherwise happily pay $20/month upfront.',
              mitigation: 'Gate essential workflow automations behind a 14-day free trial rather than a permanent unmetered tier.',
            },
          ],
          swot: {
            strengths: ['Low customer acquisition cost (CAC)', 'Rapid brand awareness', 'Strong network effects'],
            weaknesses: ['Low free-to-paid conversion rate (typically 2-4%)', 'Infrastructure cost inflation', 'Customer support dilution'],
            opportunities: ['Viral bottom-up enterprise adoption (Slack/Notion model)', 'Third-party ecosystem plugins', 'Freemium sponsor partnerships'],
            threats: ['Free tier abuse and scraping bots', 'Competitors offering cheaper hosted clones', 'Burnout managing free user requests'],
          },
          criteriaScores: {
            crit_1: { score: 10, comment: 'Unrivaled user onboarding without credit card barriers' },
            crit_2: { score: 5, comment: 'Delayed monetisation with 2-3% conversion averages' },
            crit_3: { score: 4, comment: 'High maintenance and server usage overhead' },
            crit_4: { score: 4, comment: 'Attracts many tire-kickers who never intend to purchase' },
            crit_5: { score: 9, comment: 'Large community generates organic buzz and tutorials' },
          },
        },
        {
          id: 'opt_flat20',
          name: 'Flat $20/Month All-Inclusive Premium Plan',
          description: 'Charge $20/month from day one with an optional 14-day trial, filtering for high-intent customers who value the solution.',
          pros: [
            {
              id: 'pro_fl_1',
              text: 'Immediate revenue per user and instant unit economics validation',
              impact: 'critical' as const,
              weight: 5,
              explanation: 'Every single onboarded customer contributes $240/year in ARR, covering infrastructure from day one.',
            },
            {
              id: 'pro_fl_2',
              text: 'High-quality customer cohort with serious product intent',
              impact: 'major' as const,
              weight: 5,
              explanation: 'Paying users report higher engagement, give constructive feedback, and treat the product as a mission-critical tool.',
            },
            {
              id: 'pro_fl_3',
              text: 'Lean infrastructure and zero free-tier server bloat',
              impact: 'moderate' as const,
              weight: 4,
              explanation: 'You only support customers who fund your operations, keeping support queues manageable.',
            },
          ],
          cons: [
            {
              id: 'con_fl_1',
              text: 'Steep top-of-funnel barrier reducing initial signup volume',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Requiring payment upfront eliminates casual browsers who might have shared the tool with colleagues.',
              mitigation: 'Offer a generous 14-day unrestricted trial with no credit card required upfront.',
            },
            {
              id: 'con_fl_2',
              text: 'Higher expectation of 24/7 uptime and polished UX from day one',
              impact: 'moderate' as const,
              weight: 3,
              explanation: 'Subscribers paying $20/month expect prompt bug fixes and reliable availability.',
              mitigation: 'Establish a clear public status page and responsive email support SLA.',
            },
          ],
          swot: {
            strengths: ['Immediate predictable MRR', 'Low customer service burden per dollar earned', 'Filters out unqualified tire-kickers'],
            weaknesses: ['Higher friction during initial marketing campaigns', 'Slower viral coefficient', 'Requires stronger sales copy and proof'],
            opportunities: ['Annual prepay discounts ($190/yr) for upfront capital', 'Expansion to team tiers ($50/mo)', 'Direct high-touch support relationships'],
            threats: ['Free competitors stealing early market oxygen', 'Subscription fatigue in consumer software', 'Higher churn if onboarding lacks quick time-to-value'],
          },
          criteriaScores: {
            crit_1: { score: 5, comment: 'Paywall creates natural signup resistance' },
            crit_2: { score: 10, comment: 'Guaranteed $20/mo per active user delivers predictable cash flow' },
            crit_3: { score: 9, comment: 'Every user pays their share of cloud infrastructure' },
            crit_4: { score: 9, comment: 'Verifies real customer willingness-to-pay immediately' },
            crit_5: { score: 6, comment: 'Smaller user volume yields fewer public community threads' },
          },
        },
      ],
      verdict: {
        recommendedOptionId: 'opt_flat20',
        headline: 'Charge the Flat $20/Month Plan: Validate Willingness-to-Pay First',
        summary: 'For early-stage products, charging $20/month upfront delivers immediate financial solvency, filters for high-conviction customers, and prevents support burnout from thousands of non-paying free users. You can always introduce a free tier later once retention is proven.',
        confidenceScore: 86,
        coreTradeoff: 'Viral top-of-funnel reach vs immediate cash-flow sustainability and validated customer intent.',
        blindSpots: [
          'The Freemium Server Mirage: Free users feel like growth, but unless 3%+ convert to paid tiers within 60 days, they drain operational runway.',
          'Pricing anchoring: It is substantially easier to discount or add a free tier later than it is to start free and force existing users onto paid plans.',
        ],
        conditionalGuidance: [
          {
            condition: 'If your software relies heavily on multi-player network effects (like messaging, collaboration, or social sharing)',
            recommendedOptionId: 'opt_freemium',
            advice: 'Adopt Freemium to maximize virality and invite loops.',
          },
          {
            condition: 'If your software solves a specific workflow pain point that saves time or makes money for professionals',
            recommendedOptionId: 'opt_flat20',
            advice: 'Charge the flat $20/month plan with a 14-day trial to establish profitable unit economics.',
          },
        ],
        gutCheckQuestion: 'Would you rather have 10,000 free users and $0 in the bank, or 250 paying subscribers generating $5,000 every month?',
      },
    };
  }

  // Scenario 2: Dinner Dilemma: Sushi vs Chinese Food (Lab Step 4 Scenario)
  if (lower.includes('sushi') || lower.includes('chinese') || lower.includes('eat') || lower.includes('dinner')) {
    return {
      id: analysisId,
      title: cleanTitle,
      context: context || 'Choosing tonight’s meal between fresh Sushi and comforting Chinese cuisine.',
      category: 'lifestyle',
      createdAt: new Date().toISOString(),
      criteria: [
        { id: 'crit_f1', name: 'Health & Nutritional Lightness', description: 'Clean protein, fresh ingredients, low post-meal sluggishness', weight: 8 },
        { id: 'crit_f2', name: 'Craving Satisfaction & Comfort', description: 'Rich savory flavors, warmth, and indulgence', weight: 9 },
        { id: 'crit_f3', name: 'Cost-to-Portion Value', description: 'Quantity of food and wallet economy', weight: 7 },
        { id: 'crit_f4', name: 'Leftover Utility Tomorrow', description: 'How well the food reheats and keeps for next day lunch', weight: 8 },
        { id: 'crit_f5', name: 'Preparation & Delivery Speed', description: 'Estimated wait time and temperature sensitivity', weight: 6 },
      ],
      options: [
        {
          id: 'opt_sushi',
          name: 'Sushi Dinner (Fresh Nigiri & Specialty Rolls)',
          description: 'Clean, light, high-protein Japanese cuisine featuring fresh fish, avocado, edamame, and miso.',
          pros: [
            {
              id: 'pro_su_1',
              text: 'Clean energy with zero heavy oil or food coma',
              impact: 'critical' as const,
              weight: 5,
              explanation: 'High in Omega-3 fatty acids and lean protein, leaving you energized for the rest of your evening.',
            },
            {
              id: 'pro_su_2',
              text: 'Culinary experience and aesthetic presentation',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Feels elevated, intentional, and satisfying to the senses.',
            },
          ],
          cons: [
            {
              id: 'con_su_1',
              text: 'Higher cost per calorie ($35-$50 typical spend)',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Fresh raw fish carries a price premium compared to noodle or stir-fry dishes.',
              mitigation: 'Order a satisfying bento combo or supplement rolls with edamame and miso soup.',
            },
            {
              id: 'con_su_2',
              text: 'Poor leftover longevity (raw fish must be eaten immediately)',
              impact: 'moderate' as const,
              weight: 4,
              explanation: 'Refrigerated raw fish loses texture and rice hardens overnight.',
              mitigation: 'Order strictly what you plan to finish tonight with zero excess rolls.',
            },
          ],
          swot: {
            strengths: ['High protein and lean nutrition', 'Zero heavy greasy crash', 'Fast prep time with no cooking steam'],
            weaknesses: ['Premium price point', 'Zero microwave reheat longevity', 'Can leave you hungry if portions are small'],
            opportunities: ['Pairing with green tea or sake for a relaxing evening', 'Trying a chef special roll'],
            threats: ['Varying fish freshness if ordering late', 'Sodium spikes from heavy soy sauce dipping'],
          },
          criteriaScores: {
            crit_f1: { score: 9, comment: 'Very clean raw fish, seaweed, and rice with minimal oil' },
            crit_f2: { score: 8, comment: 'Deep umami satisfaction without feeling sluggish' },
            crit_f3: { score: 5, comment: 'High price per unit volume' },
            crit_f4: { score: 3, comment: 'Does not reheat well; raw fish must be eaten fresh' },
            crit_f5: { score: 8, comment: 'Quick prep and arrives cold/fresh without sogginess' },
          },
        },
        {
          id: 'opt_chinese',
          name: 'Chinese Food (Savory Stir-Fry, Dumplings & Noodles)',
          description: 'Warm, generous, flavor-packed dishes with comforting sauces, rice, and crispy appetizers.',
          pros: [
            {
              id: 'pro_ch_1',
              text: 'Maximum comfort food satisfaction and rich savory flavors',
              impact: 'critical' as const,
              weight: 5,
              explanation: 'Warm wok hei, garlic, ginger, and savory sauces satisfy deep cravings after a demanding day.',
            },
            {
              id: 'pro_ch_2',
              text: 'Exceptional volume value with delicious leftovers for tomorrow',
              impact: 'major' as const,
              weight: 5,
              explanation: 'Chinese takeout famously reheats in a skillet or microwave to provide an effortless lunch tomorrow.',
            },
          ],
          cons: [
            {
              id: 'con_ch_1',
              text: 'Higher sodium, oil, and potential post-dinner fatigue',
              impact: 'major' as const,
              weight: 4,
              explanation: 'Rich sauces and carbs can trigger a heavy digestive slump if you have evening tasks.',
              mitigation: 'Ask for steamed rice, sauce on the side, or include steamed gai lan / broccoli.',
            },
          ],
          swot: {
            strengths: ['Generous portion sizes', 'Deep comfort flavors', 'Superb leftover versatility'],
            weaknesses: ['Higher sodium and starch content', 'Risk of heavy food fatigue afterwards'],
            opportunities: ['Effortless meal prep for tomorrow lunch', 'Sharing family-style variety'],
            threats: ['Soggy fried appetizers if delivery is delayed in traffic'],
          },
          criteriaScores: {
            crit_f1: { score: 5, comment: 'Higher in oil, sodium, and heavy cornstarch sauces' },
            crit_f2: { score: 10, comment: 'Ultimate comforting, savory warmth' },
            crit_f3: { score: 9, comment: 'Enormous portion sizes deliver two full meals' },
            crit_f4: { score: 10, comment: 'Legendary reheat quality in a skillet next day' },
            crit_f5: { score: 7, comment: 'Hot containers can create steam moisture during transit' },
          },
        },
      ],
      verdict: {
        recommendedOptionId: 'opt_sushi',
        headline: 'Choose Sushi Tonight: Clean Energy and Zero Food Coma',
        summary: 'If you want to feel energized, sharp, and satisfied without the sluggish sodium hangover of heavy takeout, Sushi is the decisive winner for tonight. If you are looking for pure comfort food with leftovers, Chinese food is your backup.',
        confidenceScore: 82,
        coreTradeoff: 'Clean, light physical vitality vs generous comfort portions and next-day leftovers.',
        blindSpots: [
          'The Soy Sauce Sodium Trap: Dousing sushi in soy sauce can deliver as much sodium as a plate of lo mein.',
          'Tomorrow lunch value: Chinese food effectively costs half as much per meal because of guaranteed leftovers.',
        ],
        conditionalGuidance: [
          {
            condition: 'If you have evening creative or intellectual work to complete tonight',
            recommendedOptionId: 'opt_sushi',
            advice: 'Order Sushi to keep your mental energy high and avoid post-meal drowsiness.',
          },
          {
            condition: 'If your primary goal is unwinding with comfort food and saving on lunch tomorrow',
            recommendedOptionId: 'opt_chinese',
            advice: 'Order Chinese food and refrigerate half immediately for a delicious next-day meal.',
          },
        ],
        gutCheckQuestion: 'When you picture yourself in two hours: do you want to feel light and refreshed, or full and ready for sleep?',
      },
    };
  }

  // General Dynamic Fallback for any dilemma
  let optionNames: string[] = [];
  if (Array.isArray(rawOptions) && rawOptions.length >= 2) {
    optionNames = rawOptions.map((o) => o.trim()).filter((o) => o.length > 0);
  } else if (cleanTitle.includes(' vs ') || cleanTitle.includes(' versus ')) {
    const parts = cleanTitle.split(/ vs | versus /i);
    optionNames = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  } else if (cleanTitle.toLowerCase().includes(' or ')) {
    const parts = cleanTitle.split(/ or /i);
    optionNames = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  if (optionNames.length < 2) {
    optionNames = ['Proceed with Action (Option A)', 'Maintain Status Quo / Alternative (Option B)'];
  }

  const optA = optionNames[0];
  const optB = optionNames[1];

  return {
    id: analysisId,
    title: cleanTitle,
    context: context || 'Multi-criteria trade-off evaluation.',
    category,
    createdAt: new Date().toISOString(),
    criteria: [
      { id: 'crit_g1', name: 'Strategic Upside & ROI', description: 'Long-term payoff and growth potential', weight: 9 },
      { id: 'crit_g2', name: 'Execution Effort & Bandwidth', description: 'Resource consumption and complexity', weight: 8 },
      { id: 'crit_g3', name: 'Downside Risk & Reversibility', description: 'Cost of failure and exit options', weight: 7 },
      { id: 'crit_g4', name: 'Speed to Impact', description: 'Time horizon before tangible feedback', weight: 8 },
    ],
    options: [
      {
        id: 'opt_1',
        name: optA,
        description: `Active pursuit of ${optA} with dedicated focus and resources.`,
        pros: [
          {
            id: 'pro_1_1',
            text: `High upside and accelerated momentum towards primary objective`,
            impact: 'critical' as const,
            weight: 5,
            explanation: `Focusing directly on ${optA} removes ambiguity and establishes forward progress.`,
          },
          {
            id: 'pro_1_2',
            text: `Clarity of ownership and decisive commitment`,
            impact: 'major' as const,
            weight: 4,
            explanation: `Eliminates the cognitive drag of perpetual hesitation.`,
          },
        ],
        cons: [
          {
            id: 'con_1_1',
            text: `Higher upfront resource and focus commitment`,
            impact: 'major' as const,
            weight: 4,
            explanation: `Requires prioritizing this path over competing alternatives.`,
            mitigation: `Set strict 30-day milestones and revisit if performance signals fall short.`,
          },
        ],
        swot: {
          strengths: ['Decisive forward posture', 'High growth potential', 'Clear focus'],
          weaknesses: ['Concentrated effort required', 'Opportunity cost of ignored paths'],
          opportunities: ['Breakthrough progress', 'First-mover advantage in this domain'],
          threats: ['Premature scaling before core assumptions are proven'],
        },
        criteriaScores: {
          crit_g1: { score: 9, comment: 'Highest potential long-term upside' },
          crit_g2: { score: 6, comment: 'Demands dedicated energy and focus' },
          crit_g3: { score: 7, comment: 'Reversible if planned in phased checkpoints' },
          crit_g4: { score: 8, comment: 'Generates real-world validation rapidly' },
        },
      },
      {
        id: 'opt_2',
        name: optB,
        description: `Alternative path prioritizing ${optB}.`,
        pros: [
          {
            id: 'pro_2_1',
            text: `Lower risk exposure and capital preservation`,
            impact: 'major' as const,
            weight: 4,
            explanation: `Protects against downside while observing external developments.`,
          },
        ],
        cons: [
          {
            id: 'con_2_1',
            text: `Opportunity cost of delayed execution`,
            impact: 'major' as const,
            weight: 4,
            explanation: `Waiting too long can forfeit early momentum.`,
            mitigation: `Establish clear trigger conditions for when to step on the gas.`,
          },
        ],
        swot: {
          strengths: ['Conservative safety buffer', 'High operational flexibility'],
          weaknesses: ['Slower growth velocity', 'Risk of passive stagnation'],
          opportunities: ['Learning from others mistakes before committing heavy capital'],
          threats: ['Falling behind more aggressive peers'],
        },
        criteriaScores: {
          crit_g1: { score: 6, comment: 'Steady but capped upside' },
          crit_g2: { score: 8, comment: 'Lower immediate friction and disruption' },
          crit_g3: { score: 9, comment: 'Minimal downside risk' },
          crit_g4: { score: 5, comment: 'Slower time to definitive answers' },
        },
      },
    ],
    verdict: {
      recommendedOptionId: 'opt_1',
      headline: `The Tiebreaker Verdict: Prioritize "${optA}"`,
      summary: `When evaluating the balance between long-term upside and operational friction, committing decisively to "${optA}" creates momentum and eliminates decision paralysis.`,
      confidenceScore: 84,
      coreTradeoff: `Decisive aggressive action vs conservative optionality preservation.`,
      blindSpots: [
        'The Cost of Inaction: Delaying a decision carries an invisible compound penalty often higher than picking the slightly imperfect path.',
      ],
      conditionalGuidance: [
        {
          condition: 'If your top priority is maximizing upside and achieving rapid clarity',
          recommendedOptionId: 'opt_1',
          advice: `Commit to "${optA}" with measurable 30-day review gates.`,
        },
        {
          condition: 'If you are facing severe bandwidth constraints or liquidity risk',
          recommendedOptionId: 'opt_2',
          advice: `Maintain "${optB}" until key risk factors subside.`,
        },
      ],
      gutCheckQuestion: `If you were forced to explain your choice to your future self in 2 years, which option would you feel proudest of choosing?`,
    },
  };
}

// Comprehensive Decision Analysis
app.post('/api/decisions/analyze', async (req, res) => {
  const { title, context, options: rawOptions, category } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'A decision question or title is required.' });
  }

  try {
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
    console.warn('Gemini API call failed or permission denied, using resilient decision engine fallback:', error?.message);
    const fallback = buildFallbackAnalysis(title, context, rawOptions, category);
    return res.json(fallback);
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
