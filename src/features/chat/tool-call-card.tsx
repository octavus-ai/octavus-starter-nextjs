'use client';

import { Check, X, Loader2, Wrench, Ban } from 'lucide-react';
import { getPartLabel, type UIToolCallPart } from '@octavus/react';
import { cn } from '@/lib/utils';

interface ToolCallCardProps {
  toolCall: UIToolCallPart;
}

/**
 * Displays the status of a tool call (pending, running, done, error, cancelled).
 * The label is the tool's authored title, else one derived from its name.
 */
export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const isRunning = toolCall.status === 'pending' || toolCall.status === 'running';
  const isCancelled = toolCall.status === 'cancelled';

  return (
    <div className="tool-call overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/30">
      <div className="flex w-full items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          <Wrench className={cn('h-4 w-4 text-slate-400', isRunning && 'animate-pulse')} />
          <span className="text-sm text-slate-400">{getPartLabel(toolCall)}</span>
          {isCancelled && <span className="text-xs text-amber-400">(cancelled)</span>}
        </div>
        <div className="flex items-center gap-2">
          {toolCall.status === 'pending' && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
          )}
          {toolCall.status === 'running' && (
            <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
          )}
          {toolCall.status === 'done' && <Check className="h-3 w-3 text-emerald-400" />}
          {toolCall.status === 'error' && <X className="h-3 w-3 text-red-400" />}
          {toolCall.status === 'cancelled' && <Ban className="h-3 w-3 text-amber-400" />}
        </div>
      </div>

      {toolCall.error && (
        <div className="border-t border-slate-700/50 px-3 py-2">
          <p className="text-xs text-red-400">{toolCall.error}</p>
        </div>
      )}
    </div>
  );
}
