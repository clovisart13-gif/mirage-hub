import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { publicPagesRouter } from "./routes/meta";
import { logger } from "./lib/logger";

const app: Express = express();

// Disable ETags globally — API responses must never be served from cache
app.set("etag", false);
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(publicPagesRouter);
app.use("/api", router);

// Global error handler — catches unhandled errors in async route handlers
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, url: req.path, method: req.method }, "Unhandled route error");
  const status = err.status ?? err.statusCode ?? 500;
  // Para erros 5xx: nunca expor mensagem interna (pode conter nomes de tabelas, SQL, etc.)
  // Para erros 4xx: a mensagem é gerada pelo próprio código e é segura para exibir
  const message = status >= 500
    ? "Erro interno do servidor"
    : (err.message ?? "Erro interno do servidor");
  res.status(status).json({ error: message });
});

export default app;
