import { redirect } from 'next/navigation';
import { MessageSquare, Zap, Code2 } from 'lucide-react';
import { getOctavusClient } from '@/lib/octavus';
import { getDefaultAgentId } from '@/lib/server-config';
import { StartChatButton } from './start-chat-button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Octavus Starter</h1>
        <p className="mb-8 text-lg text-slate-400">
          A Next.js template for building agentic applications with Octavus
        </p>

        <StartChatForm />

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Streaming Chat"
            description="Real-time streaming responses with thinking, tools, and files"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="File Uploads"
            description="Upload images and documents directly in the chat"
          />
          <FeatureCard
            icon={<Code2 className="h-6 w-6" />}
            title="Extensible"
            description="Add custom tools, client tools, and object renderers"
          />
        </div>
      </div>
    </main>
  );
}

async function StartChatForm() {
  async function startChat() {
    'use server';

    const client = getOctavusClient();
    const agentId = getDefaultAgentId();

    // Create a new session with the agent
    const { id: sessionId } = await client.sessions.create(agentId, {
      COMPANY_NAME: 'Acme Inc',
      USER_ID: 'user-123',
    });

    // Redirect to the chat page
    redirect(`/chat/${sessionId}`);
  }

  return (
    <form action={startChat}>
      <StartChatButton />
    </form>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left">
      <div className="mb-3 inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
