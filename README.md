# Octavus Starter - Next.js

A minimal Next.js starter template for building agentic applications with [Octavus](https://octavus.ai).

## Features

- **Streaming Chat** - Real-time streaming responses with thinking blocks, tool calls, and file attachments
- **File Uploads** - Upload images and documents directly in the chat interface
- **Error Handling** - User-friendly error display with retry information
- **Extensible** - Add custom tools, client tools, and object renderers

## Quick Start

Requires Node.js 22+.

### 1. Clone and Install

```bash
# Clone this template
npx degit octavus-ai/octavus-starter-nextjs my-agent-app
cd my-agent-app

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and add your Octavus credentials:

```env
OCTAVUS_API_URL=https://octavus.ai
OCTAVUS_API_KEY=your-api-key-here
OCTAVUS_AGENT_ID=your-agent-id-here
```

- Create an API key on your project's **API Keys** page at [octavus.ai](https://octavus.ai)
- Get your agent ID from the sync output below, the agent's page, or by running `npx octavus list`

### 3. Sync Your Agent

The template includes an example agent in `agents/my-agent/`. To use your own agent:

1. **Option A**: Download from Octavus UI and place in `agents/` directory
2. **Option B**: Use the CLI to validate and sync:

```bash
npm run agents:validate
npm run agents:sync
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your agent in action.

## Project Structure

```
├── agents/
│   └── my-agent/              # Example agent configuration
│       ├── prompts/
│       │   ├── system.md      # System prompt
│       │   └── user-message.md
│       └── protocol.yaml      # Agent protocol definition
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page with "Start Chat" button
│   │   ├── globals.css        # Global styles + chat component overrides
│   │   ├── chat/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx   # Chat page
│   │   └── api/
│   │       ├── trigger/       # Proxies triggers to Octavus
│   │       │   └── route.ts
│   │       └── upload-urls/   # Gets presigned URLs for file uploads
│   │           └── route.ts
│   ├── features/
│   │   └── chat/              # Chat UI components
│   │       ├── chat-interface.tsx
│   │       ├── message-bubble.tsx
│   │       ├── reasoning-block.tsx
│   │       ├── tool-call-card.tsx
│   │       └── operation-card.tsx
│   └── lib/
│       ├── octavus.ts         # Octavus client factory
│       ├── server-config.ts   # Environment configuration
│       └── agents/            # Agent tool handlers
│           ├── index.ts
│           ├── types.ts
│           └── my-agent.ts    # Example agent tools
└── package.json
```

## Customization

### Adding Tools

Edit `src/lib/agents/my-agent.ts` to add tool handlers:

```typescript
const tools: ToolHandlers = {
  'my-custom-tool': async (args) => {
    // Your tool implementation
    return { result: 'Success' };
  },
};
```

Make sure the tool is defined in your agent's `protocol.yaml`, with a `title` for the label users see and a `description` written for the model:

```yaml
tools:
  my-custom-tool:
    display: title
    title: Running my tool
    description: What the tool does and when the agent should use it.
```

### Client Tools

Tools run on your server by default. To handle a tool in the browser instead, register it in `clientTools` on `useOctavusChat`. Any tool the agent calls that has no server-side handler is forwarded to the client:

```typescript
const { messages, send } = useOctavusChat({
  transport,
  clientTools: {
    'my-client-tool': (args) => {
      // Runs in the browser - read the DOM, prompt the user, etc.
      return Promise.resolve({ ok: true });
    },
  },
});
```

Define the tool in your agent's `protocol.yaml` with no server handler, and the SDK forwards its calls to the browser.

### Styling

The chat components use Tailwind CSS. Customize the look by:

1. **Editing `globals.css`** - Override the semantic CSS classes
2. **Modifying components** - Edit files in `src/features/chat/`
3. **Theme configuration** - Add design tokens in a [`@theme`](https://tailwindcss.com/docs/theme) block in `globals.css` (Tailwind CSS v4)

### Custom Object Renderers

For structured output types, create custom renderers:

```typescript
import type { ObjectRenderer } from '@/features/chat';

const MyCustomRenderer: ObjectRenderer = ({ part, onSuggestionClick }) => {
  const data = part.object as MyCustomType;
  return (
    <div className="custom-card">
      {/* Your custom rendering */}
    </div>
  );
};

// Pass to ChatInterface
<ChatInterface
  objectRenderers={{
    MyCustomType: MyCustomRenderer,
  }}
/>
```

## API Reference

### ChatInterface Props

| Prop | Type | Description |
|------|------|-------------|
| `sessionId` | `string` | The Octavus session ID |
| `agentId` | `string` | The agent ID from the Octavus platform |
| `initialMessages` | `UIMessage[]?` | Optional initial messages |
| `objectRenderers` | `ObjectRendererRegistry?` | Custom renderers for structured outputs |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OCTAVUS_API_URL` | No | Octavus platform URL (default: https://octavus.ai) |
| `OCTAVUS_API_KEY` | Yes | Your Octavus API key |
| `OCTAVUS_AGENT_ID` | Yes | The agent ID to use for new sessions |
| `OCTAVUS_CLI_API_KEY` | No | API key for `agents:validate` and `agents:sync` (falls back to `OCTAVUS_API_KEY`) |

## Learn More

- [Octavus Documentation](https://octavus.ai/docs)
- [Protocol Reference](https://octavus.ai/docs/protocol/overview)
- [Server SDK Reference](https://octavus.ai/docs/server-sdk/overview)
- [Client SDK Reference](https://octavus.ai/docs/client-sdk/overview)

## License

MIT
