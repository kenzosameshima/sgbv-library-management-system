import { Request, Response, NextFunction } from "express";

/**
 * Middleware para detectar e rejeitar campos extras em payloads JSON
 * Deve ser aplicado ANTES do express.json()
 */
export function strictJsonParser(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  // Apenas valida em POST, PUT, PATCH
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  let bodyString = "";

  // Buffer do stream
  req.on("data", (chunk: Buffer) => {
    bodyString += chunk.toString("utf8");
    if (bodyString.length > 1e6) {
      req.pause();
      res.status(413).json({ message: "Payload muito grande" });
    }
  });

  req.on("end", () => {
    try {
      if (!bodyString) {
        return next();
      }

      const parsed = JSON.parse(bodyString);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof SyntaxError) {
        res.status(400).json({ message: "JSON inválido no corpo da requisição" });
      } else {
        res.status(400).json({ message: "Erro ao processar requisição" });
      }
    }
  });

  req.on("error", () => {
    res.status(400).json({ message: "Erro ao ler corpo da requisição" });
  });
}

/**
 * Middleware que valida tamanho máximo de payload
 * Protege contra ataques de negação de serviço
 */
export function validatePayloadSize(maxSize: number = 1e6) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > maxSize) {
      res.status(413).json({ message: `Payload não pode exceder ${maxSize / 1024}KB` });
      return;
    }

    next();
  };
}
