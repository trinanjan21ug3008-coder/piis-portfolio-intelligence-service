/**
 * PIIS Daily Briefing — Cloudflare Pages Function
 *
 * Calls Claude API with the web_search server-tool for live market intelligence,
 * forces structured output via the submit_briefing client-tool schema.
 *
 * Uses direct fetch (no SDK) — runs in the Workers runtime with zero deps.
 *
 * Env vars (set in Cloudflare Pages → Settings → Environment variables):
 *   ANTHROPIC_API_KEY   (required)
 *   PIIS_MODEL          (optional, default: claude-sonnet-4-6)
 *   PIIS_MAX_SEARCHES   (optional, default: 6)
 */

const MODEL_DEFAULT = 'claude-sonnet-4-6';
const MAX_SEARCHES_DEFAULT = 6;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

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
            event: { type: 'string', description: 'Concise description of what changed.' },
            why_it_matters: { type: 'string', description: 'Concrete impact on investor decisions.' },
            impact: { type: 'string', enum: ['++', '+', '0', '-', '--'], description: 'Impact rating.' },
            action_required: { type: 'boolean', description: 'Whether the user needs to take action.' },
            related_holding: { type: 'string', description: 'Holding name if directly relevant.' },
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
            conviction_change: { type: 'string', description: 'e.g., Strengthening / Intact / Weakening / Broken' },
            suggested_action: { type: 'string', description: 'e.g., Hold / Add / Trim / Exit / Research' },
          },
          required: ['holding', 'new_information', 'impact', 'conviction_change', 'suggested_action'],
        },
      },
      mispricing_opportunities: {
        type: 'array',
        description: 'Hidden beneficiaries, hidden losers, second-order effects, underappreciated developments.',
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
        description: 'At least three developments that challenge portfolio positions, theses, or consensus. Be honest.',
        items: {
          type: 'object',
          properties: {
            thesis: { type: 'string', description: 'The thesis being challenged.' },
            contradictory_evidence: { type: 'string' },
            importance: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: ['thesis', 'contradictory_evidence', 'importance'],
        },
      },
      smart_money: {
        type: 'array',
        description: 'Significant promoter, insider, block deal, FII/DII flow signals only.',
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
        description: 'Material earnings, guidance, buybacks, dividends, debt, contracts, regulatory. Answer "what changed vs previous communication".',
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
        description: 'Unusual developments only. Skip routine readings.',
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

async function callAnthropic(apiKey, body) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { error: { message: text } }; }
  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders, ...extra },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { portfolio, totalInvested, date } = body || {};
  if (!Array.isArray(portfolio) || portfolio.length === 0) {
    return jsonResponse({ error: 'Portfolio is required and must be a non-empty array.' }, 400);
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'Server is not configured: ANTHROPIC_API_KEY is missing. Set it in Cloudflare Pages → Settings → Environment variables.' }, 500);
  }

  const model = env.PIIS_MODEL || MODEL_DEFAULT;
  const maxSearches = Number(env.PIIS_MAX_SEARCHES) || MAX_SEARCHES_DEFAULT;
  const today = date || new Date().toISOString().slice(0, 10);

  const baseRequest = {
    model,
    max_tokens: 8192,
    system: buildSystemPrompt(today),
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches },
      SUBMIT_BRIEFING_TOOL,
    ],
    messages: [
      { role: 'user', content: buildUserMessage(portfolio, totalInvested, today) },
    ],
  };

  try {
    const first = await callAnthropic(apiKey, baseRequest);
    let briefing = findBriefingBlock(first.content);
    let sources = extractSources(first.content);
    let totalInput = first.usage?.input_tokens || 0;
    let totalOutput = first.usage?.output_tokens || 0;

    if (!briefing) {
      const follow = await callAnthropic(apiKey, {
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
      return jsonResponse({ error: 'Model did not return a structured briefing. Try regenerating.' }, 502);
    }

    return jsonResponse({
      briefing,
      sources,
      model,
      usage: { input_tokens: totalInput, output_tokens: totalOutput },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err?.message || 'Unknown error';
    const status = err?.status || 500;
    if (status === 401 || /api[_ ]?key/i.test(message)) {
      return jsonResponse({ error: 'API key is invalid. Check ANTHROPIC_API_KEY in your Cloudflare Pages environment variables.' }, 500);
    }
    if (status === 429) {
      return jsonResponse({ error: 'Rate limited by Claude API. Wait a moment and retry.' }, 429);
    }
    return jsonResponse({ error: message }, status);
  }
}
