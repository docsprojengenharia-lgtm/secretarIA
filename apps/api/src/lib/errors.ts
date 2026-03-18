export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
