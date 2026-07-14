'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, ExternalLink } from 'lucide-react';
import {
  isOtherThread,
  type UIMessage,
  type UIMessagePart,
  type UITextPart,
  type UIReasoningPart,
  type UIToolCallPart,
  type UIOperationPart,
  type UISourcePart,
  type UIFilePart,
  type UIObjectPart,
} from '@octavus/react';
import { cn } from '@/lib/utils';

import { ReasoningBlock } from './reasoning-block';
import { ToolCallCard } from './tool-call-card';
import { OperationCard } from './operation-card';
import type { ObjectRendererRegistry } from './object-renderers';

export { type ObjectRendererRegistry };

export interface MessageBubbleProps {
  message: UIMessage;
  /** Callback when user clicks a suggestion */
  onSuggestionClick?: (suggestion: string) => void;
  /** Custom object renderers for structured output types */
  objectRenderers?: ObjectRendererRegistry;
}

export function MessageBubble({
  message,
  onSuggestionClick,
  objectRenderers = {},
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';

  if (isUser) {
    return (
      <div className="message message--user mb-4 flex flex-row-reverse gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-slate-300">
          You
        </div>
        <div className="message-content relative flex-1 rounded-lg bg-slate-700/50 p-4 text-slate-100">
          {message.parts.map((part, index) => (
            <UserPartRenderer key={index} part={part} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="message message--assistant mb-4">
      {message.parts.map((part, index) => (
        <PartRenderer
          key={index}
          part={part}
          isFirst={index === 0}
          onSuggestionClick={onSuggestionClick}
          objectRenderers={objectRenderers}
        />
      ))}

      {/* Show streaming indicator if no parts yet */}
      {isStreaming && message.parts.length === 0 && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-400">
            AI
          </div>
          <div className="flex-1 rounded-lg bg-slate-800/50 p-4">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-slate-500"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-slate-500"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserPartRenderer({ part }: { part: UIMessagePart }) {
  if (part.type === 'text') {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
      </div>
    );
  }

  if (part.type === 'file') {
    const isImage = part.mediaType.startsWith('image/');
    const displayName = part.filename ?? 'Attachment';

    if (isImage) {
      return (
        <a href={part.url} target="_blank" rel="noopener noreferrer" className="mb-2 block">
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
          <img
            src={part.url}
            alt={displayName}
            className="max-h-48 rounded-lg object-contain"
            loading="lazy"
          />
        </a>
      );
    }

    return (
      <a
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 flex items-center gap-2 rounded-lg bg-slate-600/50 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">{displayName}</span>
        <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-50" />
      </a>
    );
  }

  if (part.type === 'object') {
    const data = (part.object ?? part.partial) as Record<string, unknown> | undefined;
    if (data?.type === 'text' && typeof data.text === 'string') {
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{data.text}</Markdown>
        </div>
      );
    }
    // Fallback for other object types
    return (
      <pre className="overflow-auto text-xs text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return null;
}

interface PartRendererProps {
  part: UIMessagePart;
  isFirst: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  objectRenderers: ObjectRendererRegistry;
}

function PartRenderer({ part, isFirst, onSuggestionClick, objectRenderers }: PartRendererProps) {
  // Skip "other thread" parts for simpler starter template
  if ('thread' in part && isOtherThread(part)) return null;

  switch (part.type) {
    case 'text':
      return <TextPartView part={part} isFirst={isFirst} />;

    case 'reasoning':
      return <ReasoningPartView part={part} isFirst={isFirst} />;

    case 'tool-call':
      return <ToolCallPartView part={part} isFirst={isFirst} />;

    case 'operation':
      return <OperationPartView part={part} isFirst={isFirst} />;

    case 'source':
      return <SourcePartView part={part} isFirst={isFirst} />;

    case 'file':
      return <FilePartView part={part} isFirst={isFirst} />;

    case 'object':
      return (
        <ObjectPartView
          part={part}
          isFirst={isFirst}
          onSuggestionClick={onSuggestionClick}
          objectRenderers={objectRenderers}
        />
      );

    default:
      return null;
  }
}

function TextPartView({ part, isFirst }: { part: UITextPart; isFirst: boolean }) {
  if (!part.text) return null;

  return (
    <div className={cn('flex gap-3', !isFirst && 'mt-4')}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-400">
        AI
      </div>
      <div className="message-content relative flex-1 rounded-lg bg-slate-800/50 p-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
        </div>
        {part.status === 'streaming' && (
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-slate-400" />
        )}
      </div>
    </div>
  );
}

function ReasoningPartView({ part, isFirst }: { part: UIReasoningPart; isFirst: boolean }) {
  if (!part.text) return null;

  return (
    <div className={cn(!isFirst && 'mt-2')}>
      <ReasoningBlock content={part.text} isStreaming={part.status === 'streaming'} />
    </div>
  );
}

function ToolCallPartView({ part, isFirst }: { part: UIToolCallPart; isFirst: boolean }) {
  return (
    <div className={cn('ml-11 mb-2', !isFirst && 'mt-2')}>
      <ToolCallCard toolCall={part} />
    </div>
  );
}

function OperationPartView({ part, isFirst }: { part: UIOperationPart; isFirst: boolean }) {
  return (
    <div className={cn('ml-11 mb-2', !isFirst && 'mt-2')}>
      <OperationCard operation={part} />
    </div>
  );
}

function SourcePartView({ part, isFirst }: { part: UISourcePart; isFirst: boolean }) {
  if (part.sourceType === 'url') {
    let domain = '';
    try {
      domain = new URL(part.url).hostname.replace('www.', '');
    } catch {
      domain = part.url;
    }

    return (
      <div className={cn('ml-11 mb-1', !isFirst && 'mt-1')}>
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-300" />
          <span className="truncate text-slate-300 group-hover:text-slate-200">
            {part.title || domain}
          </span>
          <span className="ml-auto shrink-0 text-xs text-slate-500">{domain}</span>
        </a>
      </div>
    );
  }

  return (
    <div className={cn('ml-11 mb-1', !isFirst && 'mt-1')}>
      <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm">
        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate text-slate-300">{part.title}</span>
        {part.filename && (
          <span className="ml-auto shrink-0 text-xs text-slate-500">{part.filename}</span>
        )}
      </div>
    </div>
  );
}

function FilePartView({ part, isFirst }: { part: UIFilePart; isFirst: boolean }) {
  const isImage = part.mediaType.startsWith('image/');
  const displayName = part.filename ?? 'Download file';

  return (
    <div className={cn('ml-11 mb-2', !isFirst && 'mt-2')}>
      <div className="file-preview overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5">
        {isImage ? (
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 URLs */}
            <img
              src={part.url}
              alt={displayName}
              className="max-h-64 w-auto object-contain"
              loading="lazy"
            />
          </a>
        ) : (
          <a
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-emerald-500/10"
          >
            <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate text-emerald-300 group-hover:text-emerald-200">
              {displayName}
            </span>
            <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-emerald-400/50 group-hover:text-emerald-400" />
          </a>
        )}
      </div>
    </div>
  );
}

interface ObjectPartViewProps {
  part: UIObjectPart;
  isFirst: boolean;
  onSuggestionClick?: (suggestion: string) => void;
  objectRenderers: ObjectRendererRegistry;
}

function ObjectPartView({ part, isFirst, onSuggestionClick, objectRenderers }: ObjectPartViewProps) {
  const marginClass = isFirst ? '' : 'mt-4';
  const Renderer = objectRenderers[part.typeName];

  if (Renderer) {
    return (
      <div className={marginClass}>
        <Renderer part={part} onSuggestionClick={onSuggestionClick} />
      </div>
    );
  }

  // Default renderer for unhandled object types
  const displayValue = part.object ?? part.partial;

  return (
    <div className={cn('flex gap-3', marginClass)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-400">
        AI
      </div>
      <div className="relative flex-1 rounded-lg bg-slate-800/50 p-4">
        <div className="mb-2 text-xs font-medium text-slate-400">{part.typeName}</div>
        {part.status === 'error' ? (
          <div className="text-sm text-red-400">{part.error}</div>
        ) : (
          <pre className="overflow-auto text-sm text-slate-300">
            {displayValue !== undefined ? JSON.stringify(displayValue, null, 2) : ''}
          </pre>
        )}
        {part.status === 'streaming' && (
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-slate-400" />
        )}
      </div>
    </div>
  );
}
