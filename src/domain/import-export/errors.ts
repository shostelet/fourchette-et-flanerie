/** Import failure with a message that can be shown to the user (French). */
export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}
