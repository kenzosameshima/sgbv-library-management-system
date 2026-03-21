import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import { sensitiveOperationRateLimiter, generalWriteRateLimiter } from "../middlewares/rateLimiters";
import { createBookHandler, deleteBookHandler, listBooksHandler, updateBookHandler } from "../controllers/bookController";

const router = Router();

router.get("/", listBooksHandler);
router.post("/", generalWriteRateLimiter, authenticate, authorize("ADMIN"), createBookHandler);
router.put("/:id", sensitiveOperationRateLimiter, authenticate, authorize("ADMIN"), updateBookHandler);
router.delete("/:id", sensitiveOperationRateLimiter, authenticate, authorize("ADMIN"), deleteBookHandler);

export default router;
