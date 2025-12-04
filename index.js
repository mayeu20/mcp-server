#!/usr/bin/env node

/**
 * NerdyChefs MCP Server
 *
 * Provides access to 900+ AI prompts from NerdyChefs.ai via the Model Context Protocol.
 *
 * Tools available:
 * - search_prompts: Search prompts by keyword, tag, or persona
 * - get_prompt: Get a specific prompt by ID
 * - list_categories: List all prompt categories
 * - list_packs: List all prompt packs
 * - get_pack: Get all prompts from a specific pack
 * - list_tags: List all available tags
 * - list_personas: List all target personas
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import https from 'https';

const API_BASE = 'https://api.nerdychefs.ai';

// Cache for API responses
const cache = {
  prompts: null,
  packs: null,
  categories: null,
  tags: null,
  personas: null,
  lastFetch: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// HTTPS fetch function (works better with corporate proxies on Windows)
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

// Fetch with caching
async function fetchWithCache(endpoint) {
  const now = Date.now();
  const cacheKey = endpoint.replace('.json', '');

  if (cache[cacheKey] && cache.lastFetch && (now - cache.lastFetch) < cache.ttl) {
    return cache[cacheKey];
  }

  try {
    const data = await httpsGet(`${API_BASE}/${endpoint}`);
    cache[cacheKey] = data;
    cache.lastFetch = now;
    return data;
  } catch (error) {
    // Return cached data if available, even if stale
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    throw error;
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'nerdychefs-prompts',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_prompts',
        description: 'Search for AI prompts by keyword, tag, category, or persona. Returns matching prompts with full content.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (searches title, tags, category, persona)'
            },
            tag: {
              type: 'string',
              description: 'Filter by specific tag (e.g., "sales", "holiday", "marketing")'
            },
            category: {
              type: 'string',
              description: 'Filter by category (e.g., "Sales", "Engineering", "Marketing")'
            },
            persona: {
              type: 'string',
              description: 'Filter by target persona (e.g., "Software Engineer", "Manager")'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10, max: 50)'
            }
          }
        }
      },
      {
        name: 'get_prompt',
        description: 'Get a specific prompt by its ID. Returns the full prompt content.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The prompt ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'list_categories',
        description: 'List all available prompt categories with descriptions and prompt counts.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'list_packs',
        description: 'List all prompt packs with their descriptions and prompt counts.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter packs by category'
            }
          }
        }
      },
      {
        name: 'get_pack',
        description: 'Get all prompts from a specific prompt pack.',
        inputSchema: {
          type: 'object',
          properties: {
            pack_title: {
              type: 'string',
              description: 'The title of the prompt pack (e.g., "AI for Sales Professionals")'
            }
          },
          required: ['pack_title']
        }
      },
      {
        name: 'list_tags',
        description: 'List all available tags with their prompt counts. Useful for discovering what topics are covered.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of tags to return (default: 50)'
            }
          }
        }
      },
      {
        name: 'list_personas',
        description: 'List all target personas (job roles) with their prompt counts.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of personas to return (default: 50)'
            }
          }
        }
      },
      {
        name: 'get_random_prompts',
        description: 'Get random prompts for inspiration. Optionally filter by category or tag.',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of random prompts (default: 5, max: 10)'
            },
            category: {
              type: 'string',
              description: 'Filter by category'
            },
            tag: {
              type: 'string',
              description: 'Filter by tag'
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_prompts': {
        const data = await fetchWithCache('prompts.json');
        let results = data.prompts;

        // Filter by query (searches title, tags, category)
        if (args.query) {
          const query = args.query.toLowerCase();
          results = results.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.tags.some(t => t.toLowerCase().includes(query)) ||
            p.category.toLowerCase().includes(query) ||
            p.subcategory.toLowerCase().includes(query) ||
            p.pack_title.toLowerCase().includes(query)
          );
        }

        // Filter by tag
        if (args.tag) {
          const tag = args.tag.toLowerCase();
          results = results.filter(p =>
            p.tags.some(t => t.toLowerCase() === tag || t.toLowerCase().includes(tag))
          );
        }

        // Filter by category
        if (args.category) {
          const cat = args.category.toLowerCase();
          results = results.filter(p =>
            p.category.toLowerCase().includes(cat)
          );
        }

        // Filter by persona
        if (args.persona) {
          const persona = args.persona.toLowerCase();
          results = results.filter(p =>
            p.personas.some(per => per.toLowerCase().includes(persona))
          );
        }

        // Limit results
        const limit = Math.min(args.limit || 10, 50);
        results = results.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: results.length,
                prompts: results.map(p => ({
                  id: p.id,
                  title: p.title,
                  prompt: p.prompt,
                  use_case: p.use_case,
                  category: p.category,
                  subcategory: p.subcategory,
                  pack_title: p.pack_title,
                  tags: p.tags,
                  personas: p.personas
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'get_prompt': {
        const data = await fetchWithCache('prompts.json');
        const prompt = data.prompts.find(p => p.id === args.id);

        if (!prompt) {
          return {
            content: [{ type: 'text', text: `Prompt with ID ${args.id} not found.` }],
            isError: true
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prompt, null, 2)
            }
          ]
        };
      }

      case 'list_categories': {
        const data = await fetchWithCache('categories.json');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: data.categories.length,
                categories: data.categories.map(c => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  icon: c.icon,
                  prompt_count: c.prompt_count
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'list_packs': {
        const data = await fetchWithCache('packs.json');
        let packs = data.packs;

        if (args.category) {
          const cat = args.category.toLowerCase();
          packs = packs.filter(p => p.category.toLowerCase().includes(cat));
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: packs.length,
                packs: packs.map(p => ({
                  id: p.id,
                  title: p.title,
                  category: p.category,
                  description: p.description,
                  total_prompts: p.total_prompts,
                  sections: p.sections
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'get_pack': {
        const data = await fetchWithCache('prompts.json');
        const packTitle = args.pack_title.toLowerCase();

        const prompts = data.prompts.filter(p =>
          p.pack_title.toLowerCase().includes(packTitle)
        );

        if (prompts.length === 0) {
          return {
            content: [{ type: 'text', text: `No prompts found for pack "${args.pack_title}".` }],
            isError: true
          };
        }

        // Group by subcategory
        const grouped = {};
        prompts.forEach(p => {
          if (!grouped[p.subcategory]) {
            grouped[p.subcategory] = [];
          }
          grouped[p.subcategory].push(p);
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                pack_title: prompts[0].pack_title,
                total_prompts: prompts.length,
                sections: Object.keys(grouped).map(section => ({
                  name: section,
                  prompts: grouped[section]
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'list_tags': {
        const data = await fetchWithCache('tags.json');
        const limit = Math.min(args.limit || 50, 200);

        // Sort by count descending
        const sortedTags = data.tags.sort((a, b) => b.count - a.count).slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: sortedTags.length,
                tags: sortedTags
              }, null, 2)
            }
          ]
        };
      }

      case 'list_personas': {
        const data = await fetchWithCache('personas.json');
        const limit = Math.min(args.limit || 50, 500);

        // Sort by count descending
        const sortedPersonas = data.personas.sort((a, b) => b.count - a.count).slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: sortedPersonas.length,
                personas: sortedPersonas
              }, null, 2)
            }
          ]
        };
      }

      case 'get_random_prompts': {
        const data = await fetchWithCache('prompts.json');
        let prompts = data.prompts;

        // Filter by category
        if (args.category) {
          const cat = args.category.toLowerCase();
          prompts = prompts.filter(p => p.category.toLowerCase().includes(cat));
        }

        // Filter by tag
        if (args.tag) {
          const tag = args.tag.toLowerCase();
          prompts = prompts.filter(p =>
            p.tags.some(t => t.toLowerCase().includes(tag))
          );
        }

        // Shuffle and take random
        const count = Math.min(args.count || 5, 10);
        const shuffled = prompts.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: selected.length,
                prompts: selected
              }, null, 2)
            }
          ]
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Define resources (for browsing prompts as documents)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const data = await fetchWithCache('categories.json');

  return {
    resources: data.categories.map(cat => ({
      uri: `nerdychefs://category/${cat.id}`,
      name: cat.name,
      description: `${cat.description} (${cat.prompt_count} prompts)`,
      mimeType: 'application/json'
    }))
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri.startsWith('nerdychefs://category/')) {
    const categoryId = uri.replace('nerdychefs://category/', '');
    const categoriesData = await fetchWithCache('categories.json');
    const category = categoriesData.categories.find(c => c.id === categoryId);

    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const promptsData = await fetchWithCache('prompts.json');
    const prompts = promptsData.prompts.filter(p =>
      category.subcategories.includes(p.category)
    );

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            category: category.name,
            description: category.description,
            prompt_count: prompts.length,
            prompts: prompts
          }, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NerdyChefs MCP Server running on stdio');
}

main().catch(console.error);
