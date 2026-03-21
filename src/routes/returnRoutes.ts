import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { generalWriteRateLimiter } from "../middlewares/rateLimiters";
import { returnLoanHandler } from "../controllers/loanController";

const router = Router();

router.post("/", generalWriteRateLimiter, authenticate, returnLoanHandler);

export default router;
