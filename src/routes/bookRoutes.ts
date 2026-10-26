import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { sensitiveOperationRateLimiter, generalWriteRateLimiter } from "../middlewares/rateLimiters";
import { createBookHandler, deleteBookHandler, listBooksHandler, updateBookHandler } from "../controllers/bookController";

const router = Router();

router.get("/", listBooksHandler);
router.post("/", authenticate, authorize("ADMIN"), generalWriteRateLimiter, createBookHandler);
router.put("/:id", authenticate, authorize("ADMIN"), sensitiveOperationRateLimiter, updateBookHandler);
router.delete("/:id", authenticate, authorize("ADMIN"), sensitiveOperationRateLimiter, deleteBookHandler);

export default router;
