interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Stortinget (Norwegian Parliament) open data MCP — data.stortinget.no.
 *
 * Keyless. Every endpoint is under https://data.stortinget.no/eksport and
 * REQUIRES ?format=json (otherwise the API returns XML). Responses are JSON
 * with Norwegian field names; key ones:
 *   sesjoner_liste        — sessions (annual; id like "2023-2024")
 *   stortingsperiode      — 4-year electoral period (id like "2021-2025")
 *   saker_liste           — cases/bills (sak = case, id is numeric sakid)
 *   representanter_liste  — MPs (fornavn=first name, etternavn=last name,
 *                            parti=party, fylke=county, kjoenn=gender)
 *   partier_liste         — parties (id like "A", navn="Arbeiderpartiet")
 *   sak_votering_liste    — votes attached to a case
 *   voteringsresultat     — per-MP results for a single vote (voteringid)
 * Dates arrive as Microsoft JSON ticks ("/Date(ms+offset)/"); pass through as-is.
 */


const BASE = 'https://data.stortinget.no/eksport';
const UA = 'pipeworx-mcp-storting-no/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'get_sessions',
    description:
      'List Norwegian Parliament (Stortinget) sessions. A session ("sesjon") runs ~Oct–Sep with an id like "2023-2024". Use the returned ids as sesjonid for other tools.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_cases',
    description:
      'List parliamentary cases/bills ("saker") for a session. Returns saker_liste with numeric case ids (sakid), titles, topics (emne_liste) and status.',
    inputSchema: {
      type: 'object',
      properties: {
        sesjonid: { type: 'string', description: 'Session id, e.g. "2023-2024". Get valid ids from get_sessions.' },
      },
      required: ['sesjonid'],
    },
  },
  {
    name: 'get_representatives',
    description:
      'List members of parliament (MPs, "representanter") for a 4-year electoral period. Returns fornavn (first), etternavn (last), parti (party), fylke (county), kjoenn (gender).',
    inputSchema: {
      type: 'object',
      properties: {
        stortingsperiodeid: { type: 'string', description: 'Electoral period id, e.g. "2021-2025".' },
      },
      required: ['stortingsperiodeid'],
    },
  },
  {
    name: 'get_parties',
    description:
      'List all political parties ("partier") known to Stortinget. Returns id (e.g. "A", "H", "FrP"), navn (full name), and representert_parti (currently represented).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_votes',
    description:
      'List the votes ("voteringer") held on a single case. Returns sak_votering_liste; each has a votering id. Pass that id to get_vote_result for per-MP breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        sakid: { type: 'string', description: 'Numeric case id (sakid) from get_cases.' },
      },
      required: ['sakid'],
    },
  },
  {
    name: 'get_vote_result',
    description:
      'Per-MP results ("voteringsresultat") for one vote: how each representative voted (for/against/absent). Pass a votering id from get_votes.',
    inputSchema: {
      type: 'object',
      properties: {
        voteringid: { type: 'string', description: 'Numeric vote id (voteringid) from get_votes.' },
      },
      required: ['voteringid'],
    },
  },
  {
    name: 'export',
    description:
      'Generic fallback to any data.stortinget.no/eksport resource. Use for endpoints without a dedicated tool, e.g. resource "moter" (meetings), "komiteer" (committees) with params {sesjonid}. ?format=json is added automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Endpoint name under /eksport, e.g. "moter", "komiteer", "sesjoner".' },
        params: { type: 'object', description: 'Query params, e.g. {"sesjonid": "2023-2024"}. Do not include format.' },
      },
      required: ['resource'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_sessions':
      return get('sesjoner');
    case 'get_cases':
      return get('saker', { sesjonid: reqStr(args, 'sesjonid', '"2023-2024"') });
    case 'get_representatives':
      return get('representanter', { stortingsperiodeid: reqStr(args, 'stortingsperiodeid', '"2021-2025"') });
    case 'get_parties':
      return get('partier');
    case 'get_votes':
      return get('voteringer', { sakid: reqStr(args, 'sakid', '"90781"') });
    case 'get_vote_result':
      return get('voteringsresultat', { voteringid: reqStr(args, 'voteringid', '"12345"') });
    case 'export': {
      const resource = reqStr(args, 'resource', '"moter"').replace(/^\/+|\/+$/g, '');
      const params = args.params;
      const extra: Record<string, string> = {};
      if (params && typeof params === 'object') {
        for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
          if (k !== 'format' && v != null) extra[k] = String(v);
        }
      }
      return get(resource, extra);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function get(resource: string, params: Record<string, string> = {}): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, format: 'json' });
  const res = await fetch(`${BASE}/${resource}?${qs.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Stortinget: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
