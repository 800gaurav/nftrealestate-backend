import { Router } from "express";
import { incomehistoryController } from "../../controllers/admin/incomehistory.controller.js";
import { requireAuth } from "../../middlewares/require-auth.js";
const router = Router();

router.get("/sponsor-income-history", requireAuth(["admin"]), incomehistoryController.proBonusHistory)
router.get("/my-downline/:userId", requireAuth(["user", "admin"]), incomehistoryController.getUserNetwork)
router.get("/user-income-report", requireAuth(["admin"]), incomehistoryController.userIncomeReport)

export { router as incomeHistory }
