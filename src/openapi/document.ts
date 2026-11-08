import { z } from "zod";
import { loginSchema, refreshSchema } from "../schemas/auth";
import { bookSchema } from "../schemas/book";
import { loanSchema, returnSchema } from "../schemas/loan";
import { reservationSchema } from "../schemas/reservation";
import { createUserSchema, payFineSchema } from "../schemas/user";
import { DEFAULT_ACCESS_COOKIE_NAME, DEFAULT_CSRF_COOKIE_NAME } from "../utils/constants";

type JsonSchema = Record<string, unknown>;

interface Operation {
  summary: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: unknown[];
  requestBody?: { required: boolean; content: { "application/json": { schema: JsonSchema } } };
  responses: Record<string, unknown>;
}

type PathItem = { servers?: Array<{ url: string }> } & Partial<Record<"get" | "post" | "put" | "delete", Operation>>;

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string }>;
  paths: Record<string, PathItem>;
  components: Record<string, unknown>;
}

/** Request bodies come straight from the validation schemas, so the spec cannot drift from what the API accepts. */
function bodyOf(schema: z.ZodType): Operation["requestBody"] {
  const jsonSchema: JsonSchema = { ...z.toJSONSchema(schema, { target: "openapi-3.0", io: "input" }) };
  delete jsonSchema.$schema; // OpenAPI documents do not carry a JSON Schema dialect marker
  return { required: true, content: { "application/json": { schema: jsonSchema } } };
}

const ref = (name: string): JsonSchema => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name: string): JsonSchema => ({ type: "array", items: ref(name) });
const object = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: "object",
  properties,
  required: Object.keys(properties)
});

const STATUS_TEXT: Record<string, string> = {
  "400": "Validation error or business rule violated",
  "401": "Not authenticated",
  "403": "Forbidden (role, ownership or CSRF)",
  "404": "Not found",
  "409": "Conflict",
  "429": "Rate limit exceeded"
};

function responses(success: Record<string, { description: string; schema?: JsonSchema }>, ...errors: string[]) {
  const result: Record<string, unknown> = {};
  for (const [status, { description, schema }] of Object.entries(success)) {
    result[status] = schema ? { description, content: { "application/json": { schema } } } : { description };
  }
  for (const status of errors) {
    result[status] = { description: STATUS_TEXT[status], content: { "application/json": { schema: ref("Error") } } };
  }
  return result;
}

const SESSION: Array<Record<string, string[]>> = [{ cookieAuth: [] }, { bearerAuth: [] }];
const csrfHeader = { $ref: "#/components/parameters/CsrfToken" };
const pathParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid" }
});
const queryParam = (name: string, description: string) => ({ name, in: "query", description, schema: { type: "string" } });

export function buildOpenApiDocument(): OpenApiDocument {
  return {
    openapi: "3.0.3",
    info: {
      title: "SGB Library Management API",
      version: "1.0.0",
      description:
        "Authenticated routes accept the HttpOnly session cookie or a Bearer access token. " +
        "State-changing requests (everything except GET and login) must also send the CSRF token " +
        `from the ${DEFAULT_CSRF_COOKIE_NAME} cookie in the X-CSRF-Token header. ` +
        "Request bodies are strict: unknown fields are rejected."
    },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/health": {
        servers: [{ url: "/" }],
        get: {
          summary: "Liveness and database check",
          tags: ["Operations"],
          responses: {
            "200": { description: "Service and database are up", content: { "application/json": { schema: object({ status: { type: "string", enum: ["ok"] } }) } } },
            "503": { description: "Database unreachable", content: { "application/json": { schema: object({ status: { type: "string", enum: ["unavailable"] } }) } } }
          }
        }
      },
      "/auth/login": {
        post: {
          summary: "Sign in and start a session",
          tags: ["Auth"],
          requestBody: bodyOf(loginSchema),
          responses: responses({ "200": { description: "Session cookies set", schema: object({ csrfToken: { type: "string" }, user: ref("User") }) } }, "400", "401", "429")
        }
      },
      "/auth/refresh": {
        post: {
          summary: "Rotate the refresh token (body or cookie) and issue new session cookies",
          tags: ["Auth"],
          parameters: [csrfHeader],
          requestBody: { ...bodyOf(refreshSchema)!, required: false },
          responses: responses({ "200": { description: "New session cookies set", schema: object({ csrfToken: { type: "string" } }) } }, "400", "401", "429")
        }
      },
      "/auth/logout": {
        post: {
          summary: "Revoke the refresh token and clear the session cookies",
          tags: ["Auth"],
          parameters: [csrfHeader],
          requestBody: { ...bodyOf(refreshSchema)!, required: false },
          responses: responses({ "204": { description: "Signed out" } }, "403")
        }
      },
      "/auth/me": {
        get: {
          summary: "Identity of the current session",
          tags: ["Auth"],
          security: SESSION,
          responses: responses({ "200": { description: "Current identity", schema: object({ user: ref("Identity") }) } }, "401")
        }
      },
      "/users": {
        post: {
          summary: "Register a user (the first user becomes ADMIN; afterwards only ADMIN may register)",
          tags: ["Users"],
          security: [{}, ...SESSION],
          parameters: [csrfHeader],
          requestBody: bodyOf(createUserSchema),
          responses: responses({ "201": { description: "User created", schema: ref("User") } }, "400", "403", "409", "429")
        }
      },
      "/users/{id}/fines": {
        get: {
          summary: "Fines of a user (owner or ADMIN)",
          tags: ["Users"],
          security: SESSION,
          parameters: [pathParam("id", "User id")],
          responses: responses({ "200": { description: "Fines, newest first", schema: arrayOf("Fine") } }, "401", "403")
        }
      },
      "/users/fines/pay": {
        post: {
          summary: "Mark a fine as paid (ADMIN)",
          tags: ["Users"],
          security: SESSION,
          parameters: [csrfHeader],
          requestBody: bodyOf(payFineSchema),
          responses: responses({ "200": { description: "Fine settled", schema: ref("Fine") } }, "400", "401", "403", "404", "429")
        }
      },
      "/books": {
        get: {
          summary: "Search the catalog",
          tags: ["Books"],
          parameters: [queryParam("title", "Case-insensitive substring"), queryParam("author", "Case-insensitive substring"), queryParam("category", "Case-insensitive substring")],
          responses: responses({ "200": { description: "Matching books ordered by title", schema: arrayOf("Book") } })
        },
        post: {
          summary: "Add a book (ADMIN)",
          tags: ["Books"],
          security: SESSION,
          parameters: [csrfHeader],
          requestBody: bodyOf(bookSchema),
          responses: responses({ "201": { description: "Book created", schema: ref("Book") } }, "400", "401", "403", "429")
        }
      },
      "/books/{id}": {
        put: {
          summary: "Update a book (ADMIN); the total cannot drop below the copies on loan",
          tags: ["Books"],
          security: SESSION,
          parameters: [csrfHeader, pathParam("id", "Book id")],
          requestBody: bodyOf(bookSchema),
          responses: responses({ "200": { description: "Book updated", schema: ref("Book") } }, "400", "401", "403", "404", "409", "429")
        },
        delete: {
          summary: "Delete a book (ADMIN)",
          tags: ["Books"],
          security: SESSION,
          parameters: [csrfHeader, pathParam("id", "Book id")],
          responses: responses({ "204": { description: "Book deleted" } }, "401", "403", "429")
        }
      },
      "/loans": {
        post: {
          summary: "Borrow a book (ADMIN may borrow for another user)",
          tags: ["Loans"],
          security: SESSION,
          parameters: [csrfHeader],
          requestBody: bodyOf(loanSchema),
          responses: responses({ "201": { description: "Loan created", schema: ref("Loan") } }, "400", "401", "404", "429")
        }
      },
      "/loans/history/{userId}": {
        get: {
          summary: "Loan history of a user (owner or ADMIN)",
          tags: ["Loans"],
          security: SESSION,
          parameters: [pathParam("userId", "User id")],
          responses: responses({ "200": { description: "Loans, newest first", schema: arrayOf("Loan") } }, "401", "403")
        }
      },
      "/returns": {
        post: {
          summary: "Return a book by loanId or bookId; late returns create a fine",
          tags: ["Loans"],
          security: SESSION,
          parameters: [csrfHeader],
          requestBody: bodyOf(returnSchema),
          responses: responses({ "200": { description: "Loan closed", schema: ref("ReturnResult") } }, "400", "401", "403", "404", "409", "429")
        }
      },
      "/reservations": {
        post: {
          summary: "Join the FIFO queue for an unavailable book",
          tags: ["Reservations"],
          security: SESSION,
          parameters: [csrfHeader],
          requestBody: bodyOf(reservationSchema),
          responses: responses({ "201": { description: "Reservation queued", schema: ref("Reservation") } }, "400", "401", "404", "409", "429")
        }
      }
    },
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: DEFAULT_ACCESS_COOKIE_NAME },
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      },
      parameters: {
        CsrfToken: {
          name: "X-CSRF-Token",
          in: "header",
          required: true,
          description: `Must equal the ${DEFAULT_CSRF_COOKIE_NAME} cookie`,
          schema: { type: "string" }
        }
      },
      schemas: {
        Error: {
          type: "object",
          required: ["code", "message", "timestamp"],
          properties: {
            code: { type: "string", example: "VALIDATION_ERROR" },
            message: { type: "string" },
            details: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            timestamp: { type: "string", format: "date-time" }
          }
        },
        Identity: object({ id: { type: "string", format: "uuid" }, role: { type: "string", enum: ["USER", "ADMIN"] }, email: { type: "string", format: "email" } }),
        User: object({ id: { type: "string", format: "uuid" }, name: { type: "string" }, email: { type: "string", format: "email" }, role: { type: "string", enum: ["USER", "ADMIN"] } }),
        Book: object({
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          author: { type: "string" },
          category: { type: "string" },
          isbn: { type: "string" },
          total_copies: { type: "integer" },
          available_copies: { type: "integer" },
          created_at: { type: "string", format: "date-time" }
        }),
        Loan: {
          ...object({
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            book_id: { type: "string", format: "uuid" },
            loan_date: { type: "string", format: "date-time" },
            due_date: { type: "string", format: "date-time" },
            return_date: { type: "string", format: "date-time", nullable: true },
            status: { type: "string", enum: ["ACTIVE", "RETURNED"] },
            created_at: { type: "string", format: "date-time" }
          })
        },
        Reservation: object({
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          book_id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["QUEUED", "AVAILABLE", "EXPIRED", "FULFILLED"] },
          created_at: { type: "string", format: "date-time" },
          expires_at: { type: "string", format: "date-time", nullable: true }
        }),
        Fine: object({
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid" },
          loan_id: { type: "string", format: "uuid" },
          amount: { type: "number" },
          paid: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          paid_at: { type: "string", format: "date-time", nullable: true }
        }),
        ReturnResult: object({ loan: ref("Loan"), fineAmount: { type: "number" } })
      }
    }
  };
}
