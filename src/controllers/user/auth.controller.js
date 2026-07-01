import jwt from "jsonwebtoken";

import { UserModel } from "../../models/user.model.js";

import { errorResponse, successResponse } from "../../utils/api-response.js";
import { getRandomOTP } from "../../utils/random-otp.js";
import { JWT_EXPIRE, JWT_SECRET } from "../../config/index.js";
import { sendRegisterationOTP, sendRegistrationCredentialsEmail, sendRegistrationOTP } from "../../utils/nodemailer.js";
import { findBinaryPlacement } from "../../helper/index.js";
import bcrypt from 'bcryptjs';
import { currentUser } from "../../middlewares/current-user.js";

import { TempUserModel } from "../../models/tempUser.model.js";

const authController = {
  sendEmailOTP: async (req, res) => {
    const { email } = req.body;

    if (!email) return errorResponse(res, "Email is required", 400);

    let user = await UserModel.findOne({ email });
    if (user && user.isEmailVerified === true) return errorResponse(res, "Email already in use", 409);

    try {
      const newOTP = getRandomOTP(6);
      if (!user) {
        user = new UserModel({ email, emailOTP: newOTP });
      } else {
        user.emailOTP = newOTP;
      };

      await sendRegistrationOTP(email, newOTP);
      await user.save();
      return successResponse(res, "OTP sent successfully.");
    } catch (error) {
      console.error("❌ Error in sendEmailOTP:", error.message);
      return errorResponse(res, error.message || "Failed to send OTP", 500);
    }
  },

  sendPhoneOTP: async (req, res) => {
    const { phone } = req.body;
    const user = await UserModel.findOne({ phone });
    if (user && user.isPhoneVerified === true) return errorResponse(res, "Phone already in use", 409);

    const newOTP = getRandomOTP(6);
    if (!user) {
      user = new UserModel({ email, phoneOTP: newOTP });
    } else {
      user.phoneOTP = newOTP;
    };

    await user.save();
    return successResponse(res, "OTP sent successfully.");
  },


  register: async (req, res) => {
    try {
      const { referrerCode, name, email, phone, password, side = "left" } = req.body;
      if (!name || !email || !phone || !password || !referrerCode)
        return errorResponse(res, "All fields are required", 400);

      const placementSide = side === "right" ? "right" : "left";

      // Check if user already exists
      const isAlreadyExists = await UserModel.findOne({ email });
      if (isAlreadyExists)
        return errorResponse(res, "Email already registered", 400);

      // Find sponsor
      const sponsor = await UserModel.findOne({ referralCode: referrerCode });
      if (!sponsor) return errorResponse(res, "Invalid referral code", 404);
      if (!sponsor.isActivated) return errorResponse(res, "Sponsor not active", 403);
      if (sponsor.referralLevel >= 18)
        return errorResponse(res, "Cannot add beyond level 18", 400);

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
      const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Save temp data
      await TempUserModel.findOneAndUpdate(
        { email },
        { name, email, phone, password, referrerCode, side: placementSide, otp, otpExpiry },
        { upsert: true, new: true }
      );

      // Send OTP email
      await sendRegisterationOTP(email, otp);

      return successResponse(res, "OTP sent to your email. Please verify to complete registration", { email });
    } catch (err) {
      console.error(err);
      return errorResponse(res, "Registration failed", 500);
    }
  },

  verifyRegistrationOtp: async (req, res) => {
    try {
      const { email, otp } = req.body;

      const tempUser = await TempUserModel.findOne({ email });
      if (!tempUser) return errorResponse(res, "No pending registration found", 404);

      if (tempUser.otp !== otp || Date.now() > tempUser.otpExpiry) {
        return errorResponse(res, "Invalid or expired OTP", 400);
      }

      // Sponsor check
      const sponsor = await UserModel.findOne({ referralCode: tempUser.referrerCode });
      if (!sponsor) return errorResponse(res, "Sponsor not found", 404);
      if (!sponsor.isActivated) return errorResponse(res, "Sponsor not active", 403);

      const placement = await findBinaryPlacement(sponsor, tempUser.side);

      // Create user
      const newUser = await UserModel.create({
        email: tempUser.email,
        name: tempUser.name,
        phone: tempUser.phone,
        password: tempUser.password, // hash it if not already
        sponsor: sponsor.userId,
        referrer: sponsor._id,
        placementId: placement.parent.userId,
        placementParent: placement.parent._id,
        placementSide: placement.side,
        binaryLevel: placement.binaryLevel,
        referralLevel: (sponsor.referralLevel || 0) + 1,
    
        
        walletBalance: 0,
      });

      await UserModel.findByIdAndUpdate(placement.parent._id, {
        [placement.side === "left" ? "leftChild" : "rightChild"]: newUser._id,
      });


      // Delete temp record
      await tempUser.deleteOne();

      // Send credentials email
      await sendRegistrationCredentialsEmail({
        toEmail: newUser.email,
        name: newUser.name,
        userId: newUser.userId,
        password: tempUser.password,
        referralCode: newUser.referralCode,
      });

      // Generate JWT
      const token = jwt.sign(
        { _id: newUser._id, role: newUser.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );

      return successResponse(res, "User registered successfully", {
        ...newUser._doc,
        token,
      });
    } catch (err) {
      console.error(err);
      return errorResponse(res, "OTP verification failed", 500);
    }
  },



  login: async (req, res) => {
    const { userId, password, usertoken } = req.body;

    if (!userId || (!password && !usertoken)) {
      return errorResponse(res, "User ID and password  are required", 400);
    }

    const user = await UserModel.findOne({ userId });
    if (!user) return errorResponse(res, "Invalid userId", 400);

    // If token is provided, verify it
    if (usertoken) {
      try {
        const decoded = jwt.verify(usertoken, JWT_SECRET);
        if (String(decoded._id) !== String(user._id)) {
          return errorResponse(res, "Token mismatch", 401);
        }
      } catch (err) {
        return errorResponse(res, "Invalid or expired token", 401);
      }
    } else {
      // If no token, check password
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        return errorResponse(res, "Invalid password", 400);
      }
    }

    if (user.isBlocked) {
      return errorResponse(res, "Account has been blocked. Contact Admin", 403);
    }

    const token = jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
    });

    successResponse(res, "Logged in successfully", {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      txnpass: user.txnpass,
      role: user.role,
      sponsor: user.sponsor,
      referralCode: user.referralCode,
      referrer: user.referrer,
      directreferaralCount: user.directreferaralCount,
      isActivated: user.isActivated,
      totalInvested: user.totalInvested,
      stakingPrincipal: user.stakingPrincipal,
      roiPercent: user.roiPercent,
      walletBalance: user.walletBalance,
      mainBalance: user.fundBalance,
      todayIncome: user.todayIncome,
      roiIncome: user.roiIncome,
      totalProfitEarned: user.totalProfitEarned,
      totalDomesticIncome: user.totalDomesticIncome,
      royalyIncome: user.royalyIncome,
      domesticUnlockedLevel: user.domesticUnlockedLevel,
      proBonusIncome: user.proBonusIncome,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      withdrawTRC_ADDRESS: user.withdrawTRC_ADDRESS,
      withdrawBEP_ADDRESS: user.withdrawBEP_ADDRESS,
      token,
    });
  },

  changeTxnPassword: async (req, res) => {
    try {
      const { newTxnPassword, confirmNewTxnPassword } = req.body;

      // Check user auth
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate input
      if (!newTxnPassword || !confirmNewTxnPassword) {
        return res.status(400).json({ message: "New transaction password fields are required" });
      }

      if (newTxnPassword !== confirmNewTxnPassword) {
        return res.status(400).json({ message: "New transaction passwords do not match" });
      }

      // Get user
      const user = await UserModel.findById(req.currentUser._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update txn password directly
      user.txnpass = newTxnPassword;
      await user.save();

      return res.status(200).json({ success: true, message: "Transaction password set successfully!" });

    } catch (error) {
      console.error("Txn Password Set Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword, confirmNewPassword } = req.body;

      // Check if user is authenticated
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ status: 'Unauthorized', message: 'User not authenticated' });
      }

      const userId = req.currentUser._id;

      if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ status: 'Bad Request', message: 'All fields are mandatory' });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ status: 'Bad Request', message: 'New passwords do not match' });
      }

      // Get user from database
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ status: 'Not Found', message: 'User not found' });
      }

      // Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ status: 'Bad Request', message: 'Old password is incorrect' });
      }

      //  update the new password
      // If you hash this password this will throw error
      user.password = newPassword;
      await user.save();

      res.status(200).json({ status: 'Success', message: 'Password updated successfully!' });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: 'Internal Server Error', message: 'Server Error' });
    }
  },

  sendForgetPasswordOtp: async (req, res) => {
    const { userId, email } = req.body;

    if (!email || !userId) return errorResponse(res, "Email is required", 400);

    const user = await UserModel.findOne({ email, userId });

    if (!user) return errorResponse(res, "User not found with this email & userId", 404);

    const newOTP = getRandomOTP(6);
    user.emailOTP = newOTP;

    await sendRegistrationOTP(email, newOTP);
    await user.save();

    return successResponse(res, "OTP sent to your email for password reset.");
  },

  resetPasswordUsingOTP: async (req, res) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return errorResponse(res, "All fields are required", 400);
    }

    if (newPassword !== confirmNewPassword) {
      return errorResponse(res, "Passwords do not match", 400);
    }

    const user = await UserModel.findOne({ email, emailOTP: otp });

    if (!user) {
      return errorResponse(res, "Invalid email or OTP", 404);
    }

    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // user.password = hashedPassword;
    // user.emailOTP = undefined; // clear OTP after use

    // await user.save();

    user.password = newPassword;
    user.emailOTP = undefined;  //clear otp after use
    await user.save();

    return successResponse(res, "Password reset successful");
  },

 
  updateUserProfile: async (req, res) => {
    try {
      const { name, email, phone, txnpass, withdrawTRC_ADDRESS, withdrawBEP_ADDRESS } = req.body;

      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ message: "Unauthorized access" });
      }

      const user = await UserModel.findById(req.currentUser._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      if (txnpass && txnpass.trim() !== "") user.txnpass = txnpass;
      if (withdrawTRC_ADDRESS && withdrawTRC_ADDRESS.trim() !== "") user.withdrawTRC_ADDRESS = withdrawTRC_ADDRESS.trim();
      if (withdrawBEP_ADDRESS && withdrawBEP_ADDRESS.trim() !== "") user.withdrawBEP_ADDRESS = withdrawBEP_ADDRESS.trim();

      await user.save();

      return res.status(200).json({ success: true, message: "Profile updated successfully" });

    } catch (error) {
      console.error("Update profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getProfile: async (req, res) => {
    try {
      if (!req.currentUser || !req.currentUser._id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await UserModel.findById(req.currentUser._id).select("-password -__v");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        message: "Profile fetched successfully",
        data: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          txnpass: user.txnpass,
          role: user.role,
          sponsor: user.sponsor,
          referralCode: user.referralCode,
          referrer: user.referrer,
          directreferaralCount: user.directreferaralCount,
          isActivated: user.isActivated,
          totalInvested: user.totalInvested,
          stakingPrincipal: user.stakingPrincipal,
          roiPercent: user.roiPercent,
          walletBalance: user.walletBalance,
          mainBalance: user.fundBalance,
          todayIncome: user.todayIncome,
          roiIncome: user.roiIncome,
          totalProfitEarned: user.totalProfitEarned,
          totalDomesticIncome: user.totalDomesticIncome,
          royalyIncome: user.royalyIncome,
          domesticUnlockedLevel: user.domesticUnlockedLevel,
          proBonusIncome: user.proBonusIncome,
          withdrawTRC_ADDRESS: user.withdrawTRC_ADDRESS,
          withdrawBEP_ADDRESS: user.withdrawBEP_ADDRESS,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      });
    } catch (err) {
      console.error("Get Profile Error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

};

export { authController }
