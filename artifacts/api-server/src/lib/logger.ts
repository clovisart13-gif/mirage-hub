import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const DATABASE_URL_PLACEHOLDER = "[REDACTED_DATABASE_URL]";
const POSTGRES_URL_PATTERN = /\bpostgres(?:ql)?:\/\/[^\s"'<>]+/gi;

export function redactDatabaseCredentials(value: string): string {
  const configuredDatabaseUrl = process.env.DATABASE_URL;
  let sanitized = value;

  if (configuredDatabaseUrl) {
    sanitized = sanitized.split(configuredDatabaseUrl).join(DATABASE_URL_PLACEHOLDER);
  }

  return sanitized.replace(POSTGRES_URL_PATTERN, DATABASE_URL_PLACEHOLDER);
}

function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return redactDatabaseCredentials(value);
  }

  if (value instanceof Error) {
    const sanitizedMessage = redactDatabaseCredentials(value.message);
    const sanitizedStack = value.stack
      ? redactDatabaseCredentials(value.stack)
      : undefined;

    if (sanitizedMessage === value.message && sanitizedStack === value.stack) {
      return value;
    }

    const sanitizedError = new Error(sanitizedMessage);
    sanitizedError.name = value.name;
    sanitizedError.stack = sanitizedStack;
    return sanitizedError;
  }

  if (!value || typeof value !== "object" || seen.has(value)) {
    return value;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sanitizeLogValue(item, seen),
    ]),
  );
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  hooks: {
    logMethod(args, method) {
      method.apply(this, args.map((arg) => sanitizeLogValue(arg)));
    },
  },
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
