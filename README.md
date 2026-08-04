# mcp-storting-no

Stortinget (Norwegian Parliament) open data MCP — data.stortinget.no.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_sessions` | List Norwegian Parliament (Stortinget) sessions. A session ("sesjon") runs ~Oct–Sep with an id like "2023-2024". Use the returned ids as sesjonid for other tools. |
| `get_cases` | List parliamentary cases/bills ("saker") for a session. Returns saker_liste with numeric case ids (sakid), titles, topics (emne_liste) and status. |
| `get_representatives` | List members of parliament (MPs, "representanter") for a 4-year electoral period. Returns fornavn (first), etternavn (last), parti (party), fylke (county), kjoenn (gender). |
| `get_parties` | List all political parties ("partier") known to Stortinget. Returns id (e.g. "A", "H", "FrP"), navn (full name), and representert_parti (currently represented). |
| `get_votes` | List the votes ("voteringer") held on a single case. Returns sak_votering_liste; each has a votering id. Pass that id to get_vote_result for per-MP breakdown. |
| `get_vote_result` | Per-MP results ("voteringsresultat") for one vote: how each representative voted (for/against/absent). Pass a votering id from get_votes. |
| `export` | Generic fallback to any data.stortinget.no/eksport resource. Use for endpoints without a dedicated tool, e.g. resource "moter" (meetings), "komiteer" (committees) with params {sesjonid}. ?format=json is added automatically. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "storting-no": {
      "url": "https://gateway.pipeworx.io/storting-no/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Storting No data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
