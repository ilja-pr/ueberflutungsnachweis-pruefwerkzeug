/*
 * Zustand des Import-Tabs. Liegt in einem Context, damit er beim Wechsel zwischen den Tabs erhalten bleibt.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { buildCheckData, type ResolvedField } from './checkData';
import { evaluate } from './evaluate';
import { parseInput, type ParseResult } from './extract/parseText';
import { readFile } from './extract/readFile';
import type { CheckData, EquationReport, Finding } from './types';

interface ImportCheckValue {
  text: string;
  fileName: string | null;
  fileType: string | null;
  busy: boolean;
  error: string | null;
  parsed: ParseResult;
  /** alle Fundstücke inkl. Katalog-Ableitungen */
  findings: Finding[];
  resolved: Map<string, ResolvedField>;
  data: CheckData;
  reports: EquationReport[];
  manualCount: number;
  removedCount: number;
  setText: (text: string, name?: string | null) => void;
  loadFile: (file: File) => Promise<void>;
  clear: () => void;
  setManual: (field: string, value: string) => void;
  clearManual: (field: string) => void;
  removeFinding: (f: Finding) => void;
  restoreRemoved: () => void;
}

const Ctx = createContext<ImportCheckValue | null>(null);

export function ImportCheckProvider({ children }: { children: ReactNode }) {
  const [text, setTextState] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [manual, setManualState] = useState<Finding[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseInput(text), [text]);
  const base = useMemo(() => [...parsed.findings.filter((f) => !removed.includes(f.id)), ...manual], [parsed, removed, manual]);
  const { data, resolved, all } = useMemo(() => buildCheckData(base), [base]);
  const reports = useMemo(() => evaluate(data), [data]);

  const setText = useCallback((t: string, name: string | null = null) => {
    setTextState(t);
    setFileName(name);
    setFileType(name ? null : 'Text');
    setRemoved([]);
    setError(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const r = await readFile(file);
      setTextState(r.text);
      setFileName(file.name);
      setFileType(r.type === 'pdf' ? 'PDF' : r.type === 'html' ? 'HTML' : 'Text');
      setRemoved([]);
    } catch (e) {
      setError(`„${file.name}“ konnte nicht gelesen werden: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTextState('');
    setFileName(null);
    setFileType(null);
    setManualState([]);
    setRemoved([]);
    setError(null);
  }, []);

  const setManual = useCallback((field: string, value: string) => {
    setManualState((m) => [...m.filter((x) => x.field !== field), { id: `manuell:${field}`, field, value, source: 'manuell' }]);
  }, []);
  const clearManual = useCallback((field: string) => setManualState((m) => m.filter((x) => x.field !== field)), []);
  const removeFinding = useCallback(
    (f: Finding) => {
      if (f.source === 'manuell') clearManual(f.field);
      else setRemoved((r) => [...r, f.id]);
    },
    [clearManual],
  );
  const restoreRemoved = useCallback(() => setRemoved([]), []);

  const value: ImportCheckValue = {
    text,
    fileName,
    fileType,
    busy,
    error,
    parsed,
    findings: all,
    resolved,
    data,
    reports,
    manualCount: manual.length,
    removedCount: removed.length,
    setText,
    loadFile,
    clear,
    setManual,
    clearManual,
    removeFinding,
    restoreRemoved,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useImportCheck(): ImportCheckValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useImportCheck braucht einen ImportCheckProvider');
  return v;
}
