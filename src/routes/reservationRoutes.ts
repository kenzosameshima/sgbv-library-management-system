import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { generalWriteRateLimiter } from "../middlewares/rateLimiters";
import { createReservationHandler } from "../controllers/reservationController";

const router = Router();

router.post("/", authenticate, generalWriteRateLimiter, createReservationHandler);

export default router;
