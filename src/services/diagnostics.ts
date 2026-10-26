export interface DiagnosticEntry {
  id: number;
  time: string;
  message: string;
  level: 'info' | 'error';
}

const listeners = new Set<() => void>();
let entries: readonly DiagnosticEntry[] = [];
let sequence = 0;

// Session-only, bounded history. Never log notes, request bodies or the cache JSON.
export function logEvent(message: string, level: DiagnosticEntry['level'] = 'info') {
  const now = new Date();
  const time = `${now.toLocaleTimeString('es-EC', { hour12: false })}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  const entry = { id: ++sequence, time, message, level };
  entries = [...entries.slice(-119), entry];
  
  //TODO 
  console.log(`[Galeria][${now.toISOString()}][${level}] ${message}`);
  listeners.forEach(listener => listener());
}

export const diagnosticStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => entries,
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error sin detalle disponible';
}
