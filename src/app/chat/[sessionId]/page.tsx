import { notFound } from 'next/navigation';
import { isNotFoundError } from '@octavus/server-sdk';
import { ChatInterface } from '@/features/chat';
import { getOctavusClient } from '@/lib/octavus';

interface ChatPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = await params;

  if (!sessionId) {
    notFound();
  }

  const client = getOctavusClient();

  let session;
  try {
    session = await client.sessions.get(sessionId);
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }
    throw error;
  }

  if (session.status === 'expired') {
    notFound();
  }

  const messages = await client.sessions.getMessages(sessionId);

  return (
    <ChatInterface sessionId={sessionId} agentId={session.agentId} initialMessages={messages} />
  );
}
