// perm-mcp.ts — permission prompt tool for the Discord bridge.
//
// Spawned by `claude -p --permission-prompt-tool mcp__perm__approve` (bot.ts
// injects this server via --mcp-config). When headless claude needs a
// permission decision, the `approve` tool relays it to bot.ts over loopback
// HTTP; bot.ts posts Discord Allow/Deny buttons and answers when the owner
// clicks (or a timeout denies). Return payload follows the permission-prompt
// -tool contract: {"behavior":"allow","updatedInput":...} | {"behavior":"deny","message":...}.
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const PORT = process.env.BRIDGE_PERM_PORT ?? '49223'
const CHAT = process.env.BRIDGE_CHAT_ID ?? ''

const mcp = new Server({ name: 'perm', version: '1.0.0' }, { capabilities: { tools: {} } })

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'approve',
    description: 'Relay a Claude Code permission request to the owner on Discord and wait for Allow/Deny.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_name: { type: 'string' },
        input: { type: 'object' },
        tool_use_id: { type: 'string' },
      },
      required: ['tool_name', 'input'],
    },
  }],
}))

mcp.setRequestHandler(CallToolRequestSchema, async req => {
  const a = (req.params.arguments ?? {}) as { tool_name?: string; input?: unknown }
  let decision: { behavior?: string; message?: string } = { behavior: 'deny', message: 'approval relay unreachable' }
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/perm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT, tool_name: a.tool_name, input: a.input }),
    })
    if (res.ok) decision = await res.json() as { behavior?: string; message?: string }
    else decision.message = `approval relay HTTP ${res.status}`
  } catch (e) {
    process.stderr.write(`perm-mcp: relay failed: ${e}\n`)
    decision.message = `approval relay error: ${e}`
  }
  const payload = decision.behavior === 'allow'
    ? { behavior: 'allow', updatedInput: a.input ?? {} }
    : { behavior: 'deny', message: decision.message ?? 'denied by owner on Discord' }
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] }
})

await mcp.connect(new StdioServerTransport())
