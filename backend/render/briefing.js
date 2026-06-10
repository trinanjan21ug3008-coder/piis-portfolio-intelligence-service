/**
 * PIIS briefing logic — Anthropic call + structured output.
 * Pure module: no Express, no I/O wiring. Reused by server.js.
 */

const Anthropic = require('@anthropic-ai/sdk');

const MODEL_DEFAULT = 'claude-sonnet-4-6';
const MAX_SEARCHES_DEFAULT = 6;

const SUBMIT_BRIEFING_TOOL = {
  name: 'submit_briefing',
  description:
    'Submit the final structured PIIS daily briefing after web research is complete. Apply the Final Filter ruthlessly: omit any item that would not cause a rational investor to alter position size, valuation assumptions, expected returns, risk assessment, monitoring priorities, or thesis confidence.',
  input_schema: {
    type: 'object',
    properties: {
      executive_summary: {
        type: 'array',
        maxItems: 7,
        description: 'Maximum 7 items. Only developments with valuation, earnings, risk, or positioning implications.',
        items: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            why_it_matters: { type: 'string' },
            impact: { type: 'string', enum: ['++', '+', '0', '-', '--'] },
            action_required: { type: 'boolean' },
            related_holding: { type: 'string' },
          },
          required: ['event', 'why_it_matters', 'impact', 'action_required'],
        },
      },
      portfolio_impact: {
        type: 'array',
        description: 'Affected holdings only. Skip holdings with no new information.',
        items: {
          type: 'object',
          properties: {
            holding: { type: 'string' },
            new_information: { type: 'string' },
            impact: { type: 'string', enum: ['++', '+', '0', '-', '--'] },
            conviction_change: { type: 'string' },
            suggested_action: { type: 'string' },
          },
          required: ['holding', 'new_information', 'impact', 'conviction_change', 'suggested_action'],
        },
      },
      mispricing_opportunities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            consensus_view: { type: 'string' },
            alternative_view: { type: 'string' },
            investment_implication: { type: 'string' },
          },
          required: ['consensus_view', 'alternative_view', 'investment_implication'],
        },
      },
      disconfirming_evidence: {
        type: 'array',
        minItems: 3,
        items: {
          type: 'object',
          properties: {
            thesis: { type: 'string' },
            contradictory_evidence: { type: 'string' },
            importance: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: ['thesis', 'contradictory_evidence', 'importance'],
        },
      },
      smart_money: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            event: { type: 'string' },
            interpretation: { type: 'string' },
            importance: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: ['event', 'interpretation', 'importance'],
        },
      },
      earnings_filings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            change_vs_previous: { type: 'string' },
            material_development: { type: 'string' },
          },
          required: ['company', 'change_vs_previous', 'material_development'],
        },
      },
      risk_dashboard: {
        type: 'object',
        properties: {
          macro: { type: 'array', items: { type: 'string' } },
          market: { type: 'array', items: { type: 'string' } },
          portfolio: { type: 'array', items: { type: 'string' } },
        },
      },
      contrarian_insight: {
        type: 'object',
        properties: {
          consensus: { type: 'string' },
          alternative_interpretation: { type: 'string' },
          evidence: { type: 'string' },
          investment_implication: { type: 'string' },
        },
      },
      decision_log: {
        type: 'object',
        properties: {
          buy: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
          add: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
          hold: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
          reduce: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
          exit: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
          research: { type: 'array', items: { type: 'object', properties: { stock: { type: 'string' }, rationale: { type: 'string' } }, required: ['stock', 'rationale'] } },
        },
      },
    },
    required: ['executive_summary', 'portfolio_impact', 'disconfirming_evidence', 'decision_log'],
  },
};

function buildSystemPrompt(date) {
  return `You are the user's Chief Investment Intelligence Analyst.

Your objective is NOT to summarize news. Your objective is to improve their investment decisions.

CORE PRINCIPLE — burn this in:
Do NOT tell the user what happened. Tell them what CHANGED.
Do NOT tell them what changed. Tell them WHETHER IT AFFECTS THEIR portfolio, watchlist, or investment theses.

FINAL FILTER — apply before including ANY item:
"Would a rational investor alter position size, valuation assumptions, expected returns, risk assessment, monitoring priorities, or thesis confidence because of this information?"
If NO — exclude it. Be ruthless. Quantity is not the goal. Signal is.

INFORMATION QUALITY — focus on:
• Regulatory filings (BSE, NSE, SEBI, MCA, RBI announcements)
• Earnings releases and management guidance shifts
• Investor presentations and conference call transcripts
• Corporate announcements (buybacks, dividends, M&A, capex, fundraises)
• Macro developments materially affecting Indian equities (RBI policy, inflation, INR, crude, global rates)
• Industry trends (sector demand, pricing, competition shifts)
• Institutional positioning (FII/DII flows when meaningfully changed)
• Insider/promoter transactions (above-routine activity)
• Capital allocation decisions (use of cash, debt actions)
• Valuation-impacting developments (margin guidance, growth re-rating)

IGNORE — low-signal noise:
• Daily price commentary, "market closed higher/lower"
• Generic broker target price changes without underlying catalyst
• Repetitive media speculation
• Macroeconomic readings within expected ranges
• Routine business-as-usual disclosures

ALWAYS — challenge the user's assumptions. Actively seek evidence that could INVALIDATE their current theses. The Disconfirming Evidence section is required (minimum 3 items) and must be sharp.

RESEARCH PROCESS:
1. Use the web_search tool to find live, dated information. Prefer sources from today or yesterday. For Indian markets, prioritize:
   bseindia.com, nseindia.com, sebi.gov.in, rbi.org.in, moneycontrol.com, livemint.com, business-standard.com, economictimes.indiatimes.com, financialexpress.com, reuters.com (India), bloombergquint.com / theken.com, screener.in, tijorifinance.com
2. Search for each major holding by name + "earnings", "filing", "block deal", "Q3 results", "guidance", "regulatory", or today's date.
3. Search for macro/sector context relevant to the user's exposures (defence, auto, banking, infrastructure, etc., based on portfolio composition).
4. Cross-reference against the user's specific theses (provided in the user message). Identify which theses are strengthening, weakening, or broken.
5. When research is complete, call the submit_briefing tool ONCE with the structured output. Do not output free-form text after research — go straight to the tool call.

DATE CONTEXT: Today is ${date}. Treat anything older than 3 trading days as potentially stale unless it is materially relevant.

MARKET CONTEXT: Primary market is Indian (NSE/BSE). Currency is INR. Use Indian numbering (lakhs/crores) in descriptions where natural.

TONE: Direct. Investment-grade. Zero filler. Each line must earn its place. Quantify where possible. Cite the specific holding by name.`;
}

function buildUserMessage(portfolio, totalInvested, date) {
  const holdings = portfolio.map((h, i) => {
    const weight = ((h.invested / totalInvested) * 100).toFixed(2);
    return `${i + 1}. ${h.name}
   Sector: ${h.sector || 'Unclassified'}
   Position: ${h.qty} shares @ avg ₹${Number(h.avgPrice).toFixed(2)} = ₹${Number(h.invested).toFixed(0)} (${weight}% of portfolio)
   Conviction: ${h.status || 'Intact'} (${h.confidence || 7}/10)
   Thesis: ${h.thesis || '(no thesis recorded)'}`;
  }).join('\n\n');

  return `Today is ${date}. Generate the PIIS daily briefing for the portfolio below.

PORTFOLIO (₹${Number(totalInvested).toFixed(0)} invested across ${portfolio.length} positions):

${holdings}

Now:
1. Research live market developments using web_search. Target the holdings above, their sectors, and macro factors relevant to Indian equities today.
2. Apply the Final Filter to every item you find.
3. Call submit_briefing with the structured output. Tie every item back to specific holdings where possible.
4. The Disconfirming Evidence section must have at least 3 sharp items that genuinely challenge the user's theses.
5. The Decision Log must reference holdings by name with a one-sentence rationale per action.`;
}

function extractSources(content) {
  const sources = [];
  const seen = new Set();
  if (!Array.isArray(content)) return sources;
  for (const block of content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item.type === 'web_search_result' && item.url && !seen.has(item.url)) {
          seen.add(item.url);
          sources.push({
            url: item.url,
            title: item.title || item.url,
            page_age: item.page_age || null,
          });
        }
      }
    }
  }
  return sources;
}

function findBriefingBlock(content) {
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (block.type === 'tool_use' && block.name === 'submit_briefing') {
      return block.input;
    }
  }
  return null;
}

async function generateBriefing({ portfolio, totalInvested, date, apiKey, model, maxSearches }) {
  if (!Array.isArray(portfolio) || portfolio.length === 0) {
    const err = new Error('Portfolio is required and must be a non-empty array.');
    err.status = 400;
    throw err;
  }
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured on the server.');
    err.status = 500;
    throw err;
  }

  const anthropic = new Anthropic({ apiKey });
  const today = date || new Date().toISOString().slice(0, 10);
  const useModel = model || MODEL_DEFAULT;
  const useSearches = Number(maxSearches) || MAX_SEARCHES_DEFAULT;

  const baseRequest = {
    model: useModel,
    max_tokens: 8192,
    system: buildSystemPrompt(today),
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: useSearches },
      SUBMIT_BRIEFING_TOOL,
    ],
    messages: [
      { role: 'user', content: buildUserMessage(portfolio, totalInvested, today) },
    ],
  };

  const first = await anthropic.messages.create(baseRequest);
  let briefing = findBriefingBlock(first.content);
  let sources = extractSources(first.content);
  let totalInput = first.usage?.input_tokens || 0;
  let totalOutput = first.usage?.output_tokens || 0;

  if (!briefing) {
    const follow = await anthropic.messages.create({
      ...baseRequest,
      tool_choice: { type: 'tool', name: 'submit_briefing' },
      messages: [
        { role: 'user', content: buildUserMessage(portfolio, totalInvested, today) },
        { role: 'assistant', content: first.content },
        { role: 'user', content: 'Call submit_briefing now with the structured briefing based on the research above.' },
      ],
    });
    briefing = findBriefingBlock(follow.content);
    sources = sources.concat(extractSources(follow.content));
    totalInput += follow.usage?.input_tokens || 0;
    totalOutput += follow.usage?.output_tokens || 0;
  }

  if (!briefing) {
    const err = new Error('Model did not return a structured briefing. Try regenerating.');
    err.status = 502;
    throw err;
  }

  return {
    briefing,
    sources,
    model: useModel,
    usage: { input_tokens: totalInput, output_tokens: totalOutput },
    generated_at: new Date().toISOString(),
  };
}

module.exports = { generateBriefing };
