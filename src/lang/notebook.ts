/**
 * SDEV Literate Markdown Notebook Engine (`src/lang/notebook.ts`)
 *
 * Parses markdown documents with embedded SDEV code blocks and executes code
 * cells sequentially, maintaining variable and function state across cells.
 */

import { execute } from './index';

export interface NotebookCell {
  id: string;
  index: number;
  kind: 'markdown' | 'code';
  language?: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface Notebook {
  cells: NotebookCell[];
  title?: string;
}

export interface CellExecutionResult {
  cellIndex: number;
  success: boolean;
  output: string[];
  error: string | null;
  durationMs: number;
}

export interface NotebookExecutionResult {
  success: boolean;
  codeCellsExecuted: number;
  cellResults: CellExecutionResult[];
  allOutputs: string[];
  totalDurationMs: number;
}

/**
 * Parses markdown into sequential markdown and code cells.
 */
export function parseNotebook(markdown: string): Notebook {
  const lines = markdown.split(/\r?\n/);
  const cells: NotebookCell[] = [];
  let inCode = false;
  let codeLang = '';
  let currentBuffer: string[] = [];
  let cellStartLine = 1;
  let title = 'Untitled Notebook';

  const firstHeading = lines.find((l) => /^#\s+(.+)$/.test(l));
  if (firstHeading) {
    const m = firstHeading.match(/^#\s+(.+)$/);
    if (m) title = m[1].trim();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^```([a-zA-Z0-9_:-]*)/);

    if (fenceMatch && !inCode) {
      // Flush preceding markdown cell if not empty
      if (currentBuffer.join('').trim()) {
        cells.push({
          id: `cell-${cells.length}`,
          index: cells.length,
          kind: 'markdown',
          content: currentBuffer.join('\n').trim(),
          startLine: cellStartLine,
          endLine: i,
        });
      }
      inCode = true;
      codeLang = fenceMatch[1].toLowerCase() || 'sdev';
      currentBuffer = [];
      cellStartLine = i + 1;
    } else if (line.startsWith('```') && inCode) {
      cells.push({
        id: `cell-${cells.length}`,
        index: cells.length,
        kind: 'code',
        language: codeLang,
        content: currentBuffer.join('\n'),
        startLine: cellStartLine,
        endLine: i + 1,
      });
      inCode = false;
      codeLang = '';
      currentBuffer = [];
      cellStartLine = i + 2;
    } else {
      currentBuffer.push(line);
    }
  }

  // Flush remaining markdown if any
  if (currentBuffer.join('').trim()) {
    cells.push({
      id: `cell-${cells.length}`,
      index: cells.length,
      kind: inCode ? 'code' : 'markdown',
      language: inCode ? codeLang : undefined,
      content: currentBuffer.join('\n').trim(),
      startLine: cellStartLine,
      endLine: lines.length,
    });
  }

  return { cells, title };
}

/**
 * Executes notebook code cells sequentially while persisting state between cells.
 */
export async function executeNotebook(
  input: string | Notebook
): Promise<NotebookExecutionResult> {
  const t0 = performance.now();
  const nb = typeof input === 'string' ? parseNotebook(input) : input;
  const cellResults: CellExecutionResult[] = [];
  const allOutputs: string[] = [];
  let overallSuccess = true;
  let codeCellsExecuted = 0;

  // Accumulated code of previous successful cells to preserve variable/function state
  const accumulatedCodeChunks: string[] = [];

  for (const cell of nb.cells) {
    if (cell.kind !== 'code') continue;

    codeCellsExecuted++;
    const tCellStart = performance.now();
    const cellCode = cell.content.trim();

    if (!cellCode) {
      cellResults.push({
        cellIndex: cell.index,
        success: true,
        output: [],
        error: null,
        durationMs: 0,
      });
      continue;
    }

    // Compose accumulated previous state with current cell
    const compositeCode = [...accumulatedCodeChunks, cellCode].join('\n\n');
    const res = execute(compositeCode);

    const cellDuration = performance.now() - tCellStart;

    if (res.success) {
      // Calculate delta outputs produced specifically by this cell
      const newOutputs = res.output.slice(allOutputs.length);
      allOutputs.push(...newOutputs);
      accumulatedCodeChunks.push(cellCode);

      cellResults.push({
        cellIndex: cell.index,
        success: true,
        output: newOutputs,
        error: null,
        durationMs: cellDuration,
      });
    } else {
      overallSuccess = false;
      cellResults.push({
        cellIndex: cell.index,
        success: false,
        output: [],
        error: res.error ?? 'Cell execution failed',
        durationMs: cellDuration,
      });
    }
  }

  return {
    success: overallSuccess,
    codeCellsExecuted,
    cellResults,
    allOutputs,
    totalDurationMs: performance.now() - t0,
  };
}
