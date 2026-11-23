export class SdevError extends Error {
  line: number;
  column?: number;

  constructor(message: string, line: number, column?: number) {
    const location = column ? `[line ${line}, col ${column}]` : `[line ${line}]`;
    super(`${location} ${message}`);
    this.name = 'SdevError';
    this.line = line;
    this.column = column;
  }
}

export class ReturnException {
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}
