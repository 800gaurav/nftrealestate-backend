import { Router } from "express";

import { authController } from "../../controllers/user/auth.controller.js";
import { currentUser } from "../../middlewares/current-user.js";
import { requireAuth } from "../../middlewares/require-auth.js";
import { testCalculateAllRewards } from "../../helper/getUpLines.js";

const router = Router();

router.post("/send-email-otp", authController.sendEmailOTP);
router.post("/send-phone-otp", authController.sendPhoneOTP);
router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyRegistrationOtp);
router.post("/login", authController.login);
router.post('/change-password', currentUser, authController.changePassword);
router.post('/change-txn-password', currentUser, authController.changeTxnPassword);
router.post('/forgot-password/send-otp', currentUser, authController.sendForgetPasswordOtp);
router.post('/forgot-password/reset', currentUser, authController.resetPasswordUsingOTP);
router.post("/update-profile", currentUser, authController.updateUserProfile);
router.get("/get-profile", currentUser, authController.getProfile);


//GewardIncome Test
router.post("/calculate-reward-income", requireAuth(["admin"]), testCalculateAllRewards)

export { router as userAuthRouter }