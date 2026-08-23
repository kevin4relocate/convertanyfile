export class HistoryStack<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  constructor(private readonly clone: (value: T) => T, private readonly limit = 60) {}

  push(previous: T): void {
    this.undoStack.push(this.clone(previous));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(current: T): T | undefined {
    const previous = this.undoStack.pop();
    if (previous === undefined) return undefined;
    this.redoStack.push(this.clone(current));
    return this.clone(previous);
  }

  redo(current: T): T | undefined {
    const next = this.redoStack.pop();
    if (next === undefined) return undefined;
    this.undoStack.push(this.clone(current));
    return this.clone(next);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
}
