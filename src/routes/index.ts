import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import bookRoutes from "./bookRoutes";
import loanRoutes from "./loanRoutes";
import returnRoutes from "./returnRoutes";
import reservationRoutes from "./reservationRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/books", bookRoutes);
router.use("/loans", loanRoutes);
router.use("/returns", returnRoutes);
router.use("/reservations", reservationRoutes);

export default router;
