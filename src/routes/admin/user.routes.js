import { Router } from "express";
import { requireAuth } from "../../middlewares/require-auth.js";
import { userController } from "../../controllers/admin/user.controller.js";
import { getBanner, updateBanner } from "../../controllers/admin/banner.controller.js";

const router = Router();

router.get("/", requireAuth(["admin"]), userController.getUsers)
router.get("/login-as-user/:userId", requireAuth(["admin"]), userController.loginAsUser)
router.get("/dashboardDetails", requireAuth(["admin"]), userController.getdashboarddetails)
router.get("/suspended-users", requireAuth(["admin"]), userController.getSuspendedUser)
router.patch("/unblockuser/:userId", requireAuth(["admin"]), userController.unblockUser)
router.get("/pendinguser", requireAuth(["admin"]), userController.getPendingUsers)
router.get("/invest-history", requireAuth(["admin"]), userController.investHistory)
router.get("/activeusers", requireAuth(["admin"]), userController.getallactiveusers)
router.get("/admin-dashboard", requireAuth(["admin"]), userController.admindashboard)
router.get("/admin-referals", requireAuth(["admin"]), userController.getAdminDirectReferrals)
router.put("/admin-update-user/:userId", requireAuth(["admin"]), userController.adminUpdateUser)
router.get("/admin-update-user-history", requireAuth(["admin"]), userController.getAdminUpdateHistory);
router.put("/update-Roistatus/:userId", requireAuth(["admin"]), userController.stopRoIIncome)
router.put("/update-Roipercent/:userId", requireAuth(["admin"]), userController.updateRoiPercent)
router.get("/get-Roistatus/:userId", requireAuth(["admin"]), userController.getRoiInomestatus)

// Admin: update banner
router.post("/update-banner", requireAuth(["admin"]), updateBanner);

// User: get active banner
router.get("/get-banner", getBanner);


export { router as adminUserRouter }
