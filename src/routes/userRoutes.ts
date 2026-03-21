import { Router } from "express";
import { createUserHandler, getUserFinesHandler, payFineHandler } from "../controllers/userController";
import { authenticate, authenticateOptional, authorize } from "../middlewares/auth";
import { userCreationRateLimiter, generalWriteRateLimiter } from "../middlewares/rateLimiters";

const router = Router();

router.post("/", userCreationRateLimiter, authenticateOptional, createUserHandler);
router.get("/:id/fines", authenticate, getUserFinesHandler);
router.post("/fines/pay", generalWriteRateLimiter, authenticate, authorize("ADMIN"), payFineHandler);

export default router;
