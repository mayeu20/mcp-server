# NerdyChefs MCP Server

Access 900+ professional AI prompts directly in Claude, Cursor, and other MCP-compatible clients.

## Features

- **900+ prompts** across 38 packs
- **Search by keyword, tag, or persona**
- **Filter by category**
- **Get random prompts for inspiration**
- **Browse by prompt pack**
- **No API key required**

## Installation

### For Claude Desktop

1. Install the MCP server:

```bash
# Clone and install
git clone https://github.com/mayeu20/mcp-server.git
cd mcp-server
npm install
```

2. Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nerdychefs": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"]
    }
  }
}
```

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nerdychefs": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\mcp-server\\index.js"]
    }
  }
}
```

3. Restart Claude Desktop

### For Cursor

Add to your Cursor MCP settings:

```json
{
  "nerdychefs": {
    "command": "node",
    "args": ["/path/to/mcp-server/index.js"]
  }
}
```

### Via npx (coming soon)

```bash
npx @nerdychefs/mcp-server
```

## Available Tools

### `search_prompts`
Search for prompts by keyword, tag, category, or persona.

```
Arguments:
- query: Search query (searches title, tags, category)
- tag: Filter by specific tag (e.g., "sales", "holiday")
- category: Filter by category (e.g., "Sales", "Engineering")
- persona: Filter by target persona (e.g., "Software Engineer")
- limit: Max results (default: 10, max: 50)
```

**Example:** "Search for prompts about email marketing"

### `get_prompt`
Get a specific prompt by ID.

```
Arguments:
- id: The prompt ID (required)
```

### `list_categories`
List all 11 prompt categories with descriptions.

### `list_packs`
List all 38 prompt packs.

```
Arguments:
- category: Filter packs by category (optional)
```

### `get_pack`
Get all prompts from a specific pack.

```
Arguments:
- pack_title: The pack title (required)
```

**Example:** "Get all prompts from the Sales pack"

### `list_tags`
List all available tags (196 total) with prompt counts.

```
Arguments:
- limit: Max tags to return (default: 50)
```

### `list_personas`
List all target personas (454 total) with prompt counts.

```
Arguments:
- limit: Max personas to return (default: 50)
```

### `get_random_prompts`
Get random prompts for inspiration.

```
Arguments:
- count: Number of prompts (default: 5, max: 10)
- category: Filter by category (optional)
- tag: Filter by tag (optional)
```

## Example Usage in Claude

Once installed, you can ask Claude things like:

- "Search for prompts about holiday emails"
- "Find prompts for software engineers"
- "List all marketing packs"
- "Get 5 random prompts about sales"
- "Show me the Sales Professional pack"
- "What tags are available?"

## Categories

| Category | Description |
|----------|-------------|
| Engineering & DevOps | Software development, DevOps, cloud infrastructure |
| Leadership & Management | Executives, managers, team leads |
| Security & Compliance | Cybersecurity, GRC, legal compliance |
| Marketing & Sales | Sales, marketing, communications |
| Finance & Analytics | Financial planning, data science |
| Operations & Support | Operations, customer success, HR |
| Cloud & FinOps | Cloud cost optimization |
| ESG & Sustainability | Environmental and social governance |
| Creative & Design | Design, UX, content creation |
| Education & Training | Teaching, instructional design |
| Startup & Entrepreneurship | Founders, startup teams |

## How It Works

This MCP server fetches prompts from the NerdyChefs.ai API:
- `https://www.nerdychefs.ai/api/prompts.json`
- `https://www.nerdychefs.ai/api/categories.json`
- `https://www.nerdychefs.ai/api/packs.json`
- `https://www.nerdychefs.ai/api/tags.json`
- `https://www.nerdychefs.ai/api/personas.json`

Data is cached for 5 minutes to improve performance.

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run normally
npm start
```

## License

MIT - Use freely in your projects.

## Links

- **Website:** https://www.nerdychefs.ai
- **API Docs:** https://www.nerdychefs.ai/api
- **Contact:** mathieu@nerdychefs.ai
