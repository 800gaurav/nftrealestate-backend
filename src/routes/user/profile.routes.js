import { Router } from "express";

import { requireAuth } from "../../middlewares/require-auth.js";
import { profileController } from "../../controllers/user/profile.controller.js";


const router = Router();

 router.get("/user-direct-refrals/:userId",requireAuth(["user", "admin"]), profileController.userDirectrefers)
// router.get("/user-direct-refrals/:userId",requireAuth(["user", "admin"]), profileController.userDirectrefers)
router.get("/sponsor-income-history/:userId",requireAuth(["user", "admin"]), profileController.probonusIncomehistory)
router.get("/get-downline-levels/:userId",requireAuth(["user", "admin"]), profileController.getDownlineLevels)
router.get("/get-left-right-user/:userId",requireAuth(["user", "admin"]), profileController.getLeftRightChild)
router.get("/get-level-members/:userId",requireAuth(["user", "admin"]), profileController.getLevelMembers)
// router.post("/main-to-fund-transfer/:userId",requireAuth(["user", "admin"]), profileController.mainTofundtransfer)
router.get("/user-dashboard/:userId",requireAuth(["user", "admin"]), profileController.userdashboarddetails);





// //deposit payment
// router.post('/create-deposit', requireAuth(["user", "admin"]), createDeposit) //to deposit amount
// router.get('/confirm/:depositId', requireAuth(["user", "admin"]), confirmDeposit) //admin confirm it
// router.get('/deposit-history/:userId', requireAuth(["user", "admin"]), getDepositHistory) //user can get deposit history

// //withdraw payment
// router.post('/request-withdrawal', requireAuth(["user", "admin"]) ,requestWithdraw)
// router.get('withrawal-history/:userId', requireAuth(["user", "admin"]), getWithdrawHistory)

export { router as userProfileRouter }
