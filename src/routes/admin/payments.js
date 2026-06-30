import express from 'express';
import { requireAuth } from "../../middlewares/require-auth.js";
import {
  requestWithdrawal,
  approveWithdrawal,
  getWithdrawHistory,
  rejectWithdrawal
} from "../../controllers/user/withdraw.controller.js"

const router = express.Router();

// Withdrawal Routes
router.post("/withdraw-request", requireAuth(['admin', 'user']), requestWithdrawal)
router.post("/withdraw-approve/:id", requireAuth(['admin']), approveWithdrawal)
router.post("/withdraw-reject/:id", requireAuth(['admin']), rejectWithdrawal)
router.get("/withdraw-history", requireAuth(['admin', 'user']), getWithdrawHistory)

export { router as paymentRoutes };
