export class NotFoundError extends Error {
  constructor(what = "Resume") {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export class LimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitReachedError";
  }
}
