import { useState } from 'react';
import { copyText } from '../lib/files';

/** Kopiert Text und zeigt kurz „kopiert“. */
export function CopyButton({ text, label = 'Kopieren', className = 'linkbtn' }: { text: string | (() => string); label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  return (
    <button
      className={className}
      onClick={async () => {
        const ok = await copyText(typeof text === 'function' ? text() : text);
        setState(ok ? 'ok' : 'fail');
        setTimeout(() => setState('idle'), 1500);
      }}
    >
      {state === 'ok' ? 'kopiert' : state === 'fail' ? 'nicht möglich' : label}
    </button>
  );
}
