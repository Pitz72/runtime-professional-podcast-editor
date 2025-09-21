/**
 * CommandManager.js - Gestisce l'esecuzione e l'annullamento dei comandi
 */
export class CommandManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0; // Pulisce la redo stack ogni volta che un nuovo comando viene eseguito
    console.log(`Command executed: ${command.constructor.name}, undo stack size: ${this.undoStack.length}`);
  }

  undo() {
    if (this.undoStack.length > 0) {
      const command = this.undoStack.pop();
      command.undo();
      this.redoStack.push(command);
      console.log(`Command undone: ${command.constructor.name}, undo stack size: ${this.undoStack.length}`);
    } else {
      console.log('Undo stack empty.');
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const command = this.redoStack.pop();
      command.execute();
      this.undoStack.push(command);
      console.log(`Command redone: ${command.constructor.name}, redo stack size: ${this.redoStack.length}`);
    } else {
      console.log('Redo stack empty.');
    }
  }
}
