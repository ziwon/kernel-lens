export class BlogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly quotaExhausted: boolean,
  ) {
    super(message);
    this.name = "BlogApiError";
  }
}
