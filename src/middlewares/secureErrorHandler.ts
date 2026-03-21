import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

/**
 * Mapeamento de erros internos para mensagens públicas seguras
 */
const ERROR_MESSAGES: Record<string, string> = {
  ECONNREFUSED: "Serviço temporariamente indisponível",
  ENOTFOUND: "Recurso não encontrado",
  ETIMEDOUT: "Operação expirou. Tente novamente",
  default: "Erro interno do servidor"
};

/**
 * Handler centralizado de erros com padronização e segurança
 * Não expõe stack traces ou detalhes internos
 */
export function secureErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const timestamp = new Date().toISOString();

  // Erros de validação Zod
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};

    err.errors.forEach((error) => {
      const path = error.path.join(".");
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(error.message);
    });

    const response: ErrorResponse = {
      code: "VALIDATION_ERROR",
      message: "Dados de entrada inválidos",
      details,
      timestamp
    };

    res.status(400).json(response);
    return;
  }

  // Erros HTTP conhecidos
  if (err instanceof HttpError) {
    const response: ErrorResponse = {
      code: err.code || "HTTP_ERROR",
      message: err.message,
      timestamp
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Erros genéricos - NÃO expõe detalhes internos
  const response: ErrorResponse = {
    code: "INTERNAL_ERROR",
    message: ERROR_MESSAGES[err.name] || ERROR_MESSAGES.default,
    timestamp
  };

  // Log seguro no servidor (sem enviar para cliente)
  console.error(`[${timestamp}] Erro não tratado:`, {
    name: err.name,
    type: err.constructor.name,
    path: _req.path,
    method: _req.method,
    // NÃO incluir stack trace aqui em produção
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });

  res.status(500).json(response);
}

/**
 * Wrapper para funções async que não retornam valor (void)
 * Garante que erros de promessas rejeitadas sejam capturados
 */
export function asyncHandler(fn: (...args: unknown[]) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
