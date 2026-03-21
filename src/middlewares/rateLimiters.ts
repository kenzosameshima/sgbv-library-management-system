import rateLimit from "express-rate-limit";

/**
 * Rate limiter para tentativas de login
 * 10 tentativas a cada 15 minutos por IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Tente novamente em alguns minutos.", code: "RATE_LIMIT_EXCEEDED" },
  skip: (req) => {
    // Em desenvolvimento, não limita se X-Bypass-Rate-Limit é definido
    return process.env.NODE_ENV !== "production" && req.headers["x-bypass-rate-limit"] === "true";
  }
});

/**
 * Rate limiter para criação de usuários
 * 5 registros a cada hora por IP
 */
export const userCreationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Muitas tentativas de registro. Tente novamente mais tarde.", code: "RATE_LIMIT_EXCEEDED" }
});

/**
 * Rate limiter para refresh de tokens
 * 30 tentativas a cada hora (proteção contra token stuffing)
 */
export const refreshTokenRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Muitas tentativas de refresh. Tente novamente mais tarde.", code: "RATE_LIMIT_EXCEEDED" }
});

/**
 * Rate limiter geral para operações de escrita
 * 100 requisições a cada 15 minutos por usuário autenticado
 */
export const generalWriteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente mais tarde.", code: "RATE_LIMIT_EXCEEDED" },
  keyGenerator: (req) => {
    // Usa user ID se autenticado, senão IP
    return req.user?.id || req.ip || "unknown";
  }
});

/**
 * Rate limiter para operações leitura
 * 500 requisições a cada 15 minutos (mais permissivo)
 */
export const generalReadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip || "unknown";
  },
  skip: (req) => {
    // Não limita GET request de saúde
    return req.path === "/health";
  }
});

/**
 * Rate limiter para operações sensíveis (deletar, atualizar status)
 * 20 tentativas a cada hora
 */
export const sensitiveOperationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Muitas operações sensíveis. Tente novamente mais tarde.", code: "RATE_LIMIT_EXCEEDED" },
  keyGenerator: (req) => {
    return req.user?.id || req.ip || "unknown";
  }
});
