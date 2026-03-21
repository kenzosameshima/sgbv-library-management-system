import { z } from "zod";

/**
 * Sanitiza uma string removendo espaços nas extremidades
 * e valores nulos/undefined
 */
export function sanitizeString(value: string | unknown): string {
  if (typeof value !== "string") {
    throw new Error("Valor deve ser uma string");
  }
  return value.trim();
}

/**
 * Normaliza um email removendo espaços e convertendo para lowercase
 */
export function normalizeEmail(value: string | unknown): string {
  if (typeof value !== "string") {
    throw new Error("Email deve ser uma string");
  }
  return value.trim().toLowerCase();
}

/**
 * Cria um Zod schema para string com sanitização, trim e tamanho máximo
 * @param minLength tamanho mínimo (padrão 1)
 * @param maxLength tamanho máximo (padrão 500)
 * @param description descrição do campo para mensagens de erro
 */
export function createStringSchema(
  minLength = 1,
  maxLength = 500,
  description = "texto"
): z.ZodType<string> {
  return z
    .string()
    .min(minLength, `${description} deve ter pelo menos ${minLength} caracteres`)
    .max(maxLength, `${description} não pode ter mais de ${maxLength} caracteres`)
    .transform(sanitizeString);
}

/**
 * Cria um Zod schema para email normalizado
 */
export function createEmailSchema(): z.ZodType<string> {
  return z
    .string()
    .min(1, "Email não pode estar vazio")
    .max(255, "Email muito longo")
    .email("Email inválido")
    .transform(normalizeEmail);
}

/**
 * Cria um Zod schema para phone com padrão básico
 */
export function createPhoneSchema(): z.ZodType<string> {
  return z
    .string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(20, "Telefone muito longo")
    .regex(/^[\d\s\-\(\)]+$/, "Telefone contém caracteres inválidos");
}

/**
 * Middleware que rejeita payloads com campos desconhecidos
 * Aplique antes do parse do Zod para máxima segurança
 */
export function validateStrictPayload(allowedFields: string[]) {
  return (data: unknown): void => {
    if (typeof data !== "object" || data === null) {
      return;
    }

    const keys = Object.keys(data);
    const unknownFields = keys.filter((k) => !allowedFields.includes(k));

    if (unknownFields.length > 0) {
      throw new Error(`Campos desconhecidos não permitidos: ${unknownFields.join(", ")}`);
    }
  };
}

/**
 * Redefinição strict do Zod para rejeitar campos extras automaticamente
 */
export const strictZod = z;
