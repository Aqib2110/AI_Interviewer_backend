export class OpenAIError extends Error {
  statusCode: number;
  code?: string | undefined;
  type?: string | undefined;
  param?: string | null | undefined;

  constructor(
    message: string,
    statusCode: number,
    options?: {
      code?: string;
      type?: string;
      param?: string | null;
    }
  ) {
    super(message);
    this.name = "OpenAIError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.type = options?.type;
    this.param = options?.param;
  }
}