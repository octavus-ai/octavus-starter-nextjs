'use client';

import { Check, Loader2, Settings2, Ban } from 'lucide-react';
import type { UIOperationPart } from '@octavus/react';
import { cn } from '@/lib/utils';

interface OperationCardProps {
  operation: UIOperationPart;
}

/**
 * Displays internal Octavus operations like serialize-thread.
 */
export function OperationCard({ operation }: OperationCardProps) {
  const isRunning = operation.status === 'running';
  const isCancelled = operation.status === 'cancelled';

  return (
    <div className="operation overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/30">
      <div className="flex w-full items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Settings2 className={cn('h-4 w-4 text-slate-400', isRunning && 'animate-pulse')} />
          <span className="text-sm text-slate-400">{operation.name}</span>
          {isCancelled && <span className="text-xs text-amber-400">(cancelled)</span>}
        </div>
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          {operation.status === 'done' && <Check className="h-3 w-3 text-emerald-400" />}
          {isCancelled && <Ban className="h-3 w-3 text-amber-400" />}
        </div>
      </div>
    </div>
  );
}
