import { Router } from "express";
import { login, logout, me, refresh } from "../controllers/authController";
import { authenticate } from "../middlewares/auth";
import { loginRateLimiter, refreshTokenRateLimiter } from "../middlewares/rateLimiters";

const router = Router();

router.post("/login", loginRateLimiter, login);
router.post("/refresh", refreshTokenRateLimiter, refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;
