'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Paperclip, X, Loader2, AlertCircle, Square, Send } from 'lucide-react';
import {
  useOctavusChat,
  createHttpTransport,
  isRateLimitError,
  isAuthenticationError,
  isProviderError,
  type UIMessage,
  type FileReference,
  type UploadUrlsResponse,
  type OctavusError,
} from '@octavus/react';
import { cn } from '@/lib/utils';

import { MessageBubble, type ObjectRendererRegistry } from './message-bubble';

/**
 * Pending file with upload status tracking.
 */
interface PendingFile {
  file: File;
  id: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  fileRef?: FileReference;
  error?: string;
  /** Blob URL for image preview - must be revoked when file is removed */
  previewUrl?: string;
}

export interface ChatInterfaceProps {
  sessionId: string;
  agentId: string;
  initialMessages?: UIMessage[];
  /** Custom object renderers for structured output types */
  objectRenderers?: ObjectRendererRegistry;
}

export function ChatInterface({
  sessionId,
  agentId,
  initialMessages = [],
  objectRenderers,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileIdCounter = useRef(0);
  const generateFileId = () => {
    fileIdCounter.current += 1;
    return `pending-${fileIdCounter.current}`;
  };

  const transport = useMemo(
    () =>
      createHttpTransport({
        request: (payload, options) =>
          fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, agentId, ...payload }),
            signal: options?.signal,
          }),
      }),
    [sessionId, agentId]
  );

  const requestUploadUrls = useCallback(
    async (
      files: { filename: string; mediaType: string; size: number }[]
    ): Promise<UploadUrlsResponse> => {
      const response = await fetch('/api/upload-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, files }),
      });
      if (!response.ok) {
        throw new Error('Failed to get upload URLs');
      }
      return await (response.json() as Promise<UploadUrlsResponse>);
    },
    [sessionId]
  );

  const { messages, status, error, send, stop, uploadFiles } = useOctavusChat({
    transport,
    requestUploadUrls,
    initialMessages,
    onError: (err: OctavusError) => {
      console.error('[Octavus Error]', {
        type: err.errorType,
        message: err.message,
        source: err.source,
        retryable: err.retryable,
      });
    },
  });

  const isStreaming = status === 'streaming';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    const frameId = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allFilesReady =
    pendingFiles.length === 0 || pendingFiles.every((pf) => pf.status === 'done');
  const isUploading = pendingFiles.some((pf) => pf.status === 'uploading');
  const hasUploadErrors = pendingFiles.some((pf) => pf.status === 'error');

  async function handleSubmit() {
    if ((!inputValue.trim() && pendingFiles.length === 0) || isStreaming) return;
    if (!allFilesReady) return;

    const fileRefs = pendingFiles
      .filter((pf) => pf.status === 'done' && pf.fileRef !== undefined)
      .map((pf) => pf.fileRef!);

    const message = inputValue;
    setInputValue('');

    // Revoke all blob URLs before clearing
    pendingFiles.forEach((pf) => {
      if (pf.previewUrl) {
        URL.revokeObjectURL(pf.previewUrl);
      }
    });
    setPendingFiles([]);

    await send(
      'user-message',
      { USER_MESSAGE: message, FILES: fileRefs.length > 0 ? fileRefs : undefined },
      { userMessage: { content: message, files: fileRefs.length > 0 ? fileRefs : undefined } }
    );
  }

  function handleSuggestionClick(suggestion: string) {
    setInputValue(suggestion);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    event.target.value = '';

    const newPendingFiles: PendingFile[] = files.map((file) => ({
      file,
      id: generateFileId(),
      status: 'uploading',
      progress: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);

    for (const pendingFile of newPendingFiles) {
      try {
        const [fileRef] = await uploadFiles([pendingFile.file], (_index, progress) => {
          setPendingFiles((prev) =>
            prev.map((pf) => (pf.id === pendingFile.id ? { ...pf, progress } : pf))
          );
        });

        setPendingFiles((prev) =>
          prev.map((pf) =>
            pf.id === pendingFile.id ? { ...pf, status: 'done', progress: 100, fileRef } : pf
          )
        );
      } catch (err) {
        setPendingFiles((prev) =>
          prev.map((pf) =>
            pf.id === pendingFile.id
              ? {
                  ...pf,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : pf
          )
        );
      }
    }
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => {
      const fileToRemove = prev.find((pf) => pf.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((pf) => pf.id !== id);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <main className="chat-container flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-white">Chat</span>
            <span className="text-xs text-slate-500">Session: {sessionId.slice(0, 12)}...</span>
          </div>
          <div
            className={cn(
              'status-badge rounded-md px-2.5 py-0.5 text-xs font-medium',
              status === 'streaming'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            )}
          >
            {status}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-4xl py-6">
          {messages.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              Start a conversation with the agent
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSuggestionClick={handleSuggestionClick}
              objectRenderers={objectRenderers}
            />
          ))}

          {/* Error Display */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">
                    {isRateLimitError(error)
                      ? 'Service is temporarily busy'
                      : isAuthenticationError(error)
                        ? 'Service configuration error'
                        : isProviderError(error)
                          ? 'AI service temporarily unavailable'
                          : 'Something went wrong'}
                  </p>
                  <p className="mt-1 text-xs text-red-400/70">{error.message}</p>

                  {isRateLimitError(error) && error.retryAfter !== undefined && (
                    <p className="mt-2 text-xs text-red-400/70">
                      Please try again in {error.retryAfter} seconds
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/50 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          {/* Pending files preview */}
          {pendingFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingFiles.map((pendingFile) => (
                <div
                  key={pendingFile.id}
                  className={cn(
                    'relative flex items-center gap-2 rounded-lg px-3 py-2',
                    pendingFile.status === 'error'
                      ? 'border border-red-500/30 bg-red-900/30'
                      : 'bg-slate-800'
                  )}
                >
                  <div className="relative">
                    {pendingFile.previewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- blob URL for preview */
                      <img
                        src={pendingFile.previewUrl}
                        alt={pendingFile.file.name}
                        className={cn(
                          'h-10 w-10 rounded object-cover',
                          pendingFile.status === 'uploading' && 'opacity-50'
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded bg-slate-700 text-xs text-slate-400',
                          pendingFile.status === 'uploading' && 'opacity-50'
                        )}
                      >
                        {pendingFile.file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                    {pendingFile.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      </div>
                    )}
                    {pendingFile.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="max-w-[100px] truncate text-sm text-slate-300">
                      {pendingFile.file.name}
                    </span>
                    {pendingFile.status === 'uploading' && (
                      <span className="text-xs text-emerald-400">Uploading...</span>
                    )}
                    {pendingFile.status === 'error' && (
                      <span className="text-xs text-red-400">{pendingFile.error || 'Failed'}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(pendingFile.id)}
                    className="ml-1 rounded-full p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isStreaming}
              rows={1}
              className="chat-input min-h-[42px] max-h-32 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isUploading ||
                  (!inputValue.trim() && pendingFiles.length === 0) ||
                  hasUploadErrors
                }
                className="flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
