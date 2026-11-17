/**
 * SDEV Literate Markdown Notebook Engine (`src/lang/notebook.ts`)
 *
 * Parses markdown documents with embedded SDEV code blocks and executes code
 * cells sequentially, maintaining variable and function state across cells.
 */

import { execute } from './executor';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';
import SDEV_TEXT_SRC from '../../lang/stdlib/v2/text.sdev?raw';
import SDEV_NOTEBOOK_SRC from '../../lang/runtime/notebook.sdev?raw';

let nbRunner: SdevModuleRunner | null = null;
function getNbRunner(): SdevModuleRunner {
  if (!nbRunner) nbRunner = createSdevModuleRunner(SDEV_TEXT_SRC, SDEV_NOTEBOOK_SRC);
  return nbRunner;
}

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
  const [title, rawCells] = getNbRunner().call('nb_parse_cells', markdown) as [
    string,
    Array<[number, 'markdown' | 'code', string, string, number, number]>
  ];
  const cells: NotebookCell[] = rawCells.map(([index, kind, lang, content, startLine, endLine]) => ({
    id: `cell-${index}`,
    index,
    kind,
    language: kind === 'code' ? (lang || 'sdev') : undefined,
    content,
    startLine,
    endLine,
  }));
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
