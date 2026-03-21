import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { generalWriteRateLimiter } from "../middlewares/rateLimiters";
import { createLoanHandler, listLoanHistoryHandler } from "../controllers/loanController";

const router = Router();

router.post("/", generalWriteRateLimiter, authenticate, createLoanHandler);
router.get("/history/:userId", authenticate, listLoanHistoryHandler);

export default router;
