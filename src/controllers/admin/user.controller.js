import { JWT_EXPIRE, JWT_SECRET } from "../../config/index.js";
import { UserModel } from "../../models/user.model.js";
import { WithdrawModel } from "../../models/withdraw.model.js";
import AdminUpdateHistory from "../../models/addedbyadminhistory.js";
import { logAdminUpdateHistory } from "../../utils/logadminupdateuserhistory.js";
import { errorResponse, successResponse } from "../../utils/api-response.js";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";
import { INCOME_PLAN } from "../../config/plans.js";

const userController = {
  getUsers: async (req, res) => {
    try {
      let { page = 1, limit = 10 } = req.query;
      page = Number(page);
      limit = Number(limit);

      const users = await UserModel.find()
        .select("userId name phone email createdAt totalInvested stakingPrincipal roiPercent walletBalance sponsor totalProfitEarned isBlocked stopROIIncome nfts")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalUsers = await UserModel.countDocuments();

      successResponse(res, "Users fetched successfully", {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
      });
    } catch (error) {
      return errorResponse(res, error.message);
    }
  },

  getPendingUsers: async (req, res) => {
    try {
      const pendingUsers = await UserModel.find({ isActivated: false }).select(
        "userId name phone email createdAt totalInvested stakingPrincipal roiPercent walletBalance sponsor totalProfitEarned nfts"
      );
      res.status(200).json({ message: "Pending users fetched successfully", pendingUsers });
    } catch (err) {
      res.status(500).json({ message: "Error fetching pending users", error: err.message });
    }
  },

  getSuspendedUser: async (req, res) => {
    try {
      const user = await UserModel.find({ isBlocked: true }).select(
        "userId name phone email createdAt walletBalance sponsor totalProfitEarned isBlocked"
      );
      if (!user) return res.status(404).json({ message: "Users not found" });
      res.status(200).json({ message: "Users fetch successfully", user });
    } catch (err) {
      res.status(500).json({ message: "Error blocking user", error: err.message });
    }
  },

  unblockUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const user = await UserModel.findOne({ userId });
      if (!user) return res.status(404).json({ message: "User not found" });
      user.isBlocked = status;
      await user.save();
      res.status(200).json({ message: "User status update successfully", user: user.isBlocked });
    } catch (err) {
      res.status(500).json({ message: "Error unblocking user", error: err.message });
    }
  },

  getdashboarddetails: async (req, res) => {
    const totalUsers = await UserModel.find().countDocuments();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayjoining = await UserModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const todayActivatedUsers = await UserModel.countDocuments({
      isActivated: true,
      planActivatedAt: { $gte: startOfToday, $lte: endOfToday },
    });
    const inactiveUsersCount = await UserModel.countDocuments({ isActivated: false });
    const activeUsersCount = await UserModel.countDocuments({ isActivated: true });

    successResponse(res, "Users fetched successfully", {
      totalUsers,
      todayjoining,
      inactiveUsersCount,
      activeUsersCount,
      todayActivatedUsers,
    });
  },

  loginAsUser: async (req, res) => {
    const { userId } = req.params;
    const user = await UserModel.findOne({ _id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const token = jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    successResponse(res, "Login as user URL generated", token);
  },

  admindashboard: async (req, res) => {
    try {
      const todayStart = dayjs().startOf("day").toDate();
      const todayEnd = dayjs().endOf("day").toDate();

      const [
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,
        todayJoinedUsers,
        totalWalletAgg,
        totalInvestedAgg,
        totalStakingAgg,
        totalSponsorAgg,
        totalMatchingAgg,
        totalRankRewardAgg,
        totalBlockedUsers,
        pendingWithdrawals,
        totalWithdrawnAgg,
      ] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ isActivated: true }),
        UserModel.countDocuments({ isActivated: false }),
        UserModel.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$walletBalance" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$totalInvested" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$roiIncome" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$proBonusIncome" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$matchingIncome" } } }]),
        UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$rankRewardIncome" } } }]),
        UserModel.countDocuments({ isBlocked: true }),
        WithdrawModel.countDocuments({ status: "pending" }),
        WithdrawModel.aggregate([
          { $match: { status: "approved" } },
          { $group: { _id: null, total: { $sum: "$payableAmount" } } },
        ]),
      ]);

      const s = (agg) => agg[0]?.total || 0;

      return res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalActiveUsers,
          totalInactiveUsers,
          totalBlockedUsers,
          todayJoinedUsers,
          totalWalletBalance: s(totalWalletAgg),
          totalInvested: s(totalInvestedAgg),
          totalStakingIncome: s(totalStakingAgg),
          totalSponsorIncome: s(totalSponsorAgg),
          totalMatchingIncome: s(totalMatchingAgg),
          totalRankRewardIncome: s(totalRankRewardAgg),
          pendingWithdrawals,
          totalWithdrawn: s(totalWithdrawnAgg),
        },
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },

  getAdminDirectReferrals: async (req, res) => {
    try {
      const adminId = req.currentUser._id;
      const directReferrals = await UserModel.find({ referrer: adminId })
        .select("userId totalInvested createdAt")
        .sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: directReferrals.length, referrals: directReferrals });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },

  getallactiveusers: async (req, res) => {
    try {
      const users = await UserModel.find({ isBlocked: false, isActivated: true }).select(
        "userId name phone email createdAt totalInvested stakingPrincipal roiPercent walletBalance sponsor totalProfitEarned isBlocked stopROIIncome nfts"
      );
      if (!users || users.length === 0) {
        return res.status(404).json({ message: "No active users found" });
      }
      res.status(200).json({ message: "Users fetched successfully", users });
    } catch (err) {
      res.status(500).json({ message: "Error fetching users", error: err.message });
    }
  },

  investHistory: async (req, res) => {
    try {
      const users = await UserModel.find({ "nfts.0": { $exists: true } }).select("name nfts");
      const allPurchases = [];
      users.forEach((user) => {
        user.nfts.forEach((nft) => {
          allPurchases.push({
            userName: user.name,
            price: nft.price,
            profitEarned: nft.profitEarned,
            purchasedAt: nft.purchasedAt,
          });
        });
      });
      res.status(200).json({ message: "All NFT purchases fetched successfully", total: allPurchases.length, data: allPurchases });
    } catch (err) {
      res.status(500).json({ message: "Error fetching NFT purchases", error: err.message });
    }
  },

  getAllProBonusHistory: async (req, res) => {
    try {
      const users = await UserModel.find({ "proBonusHistory.0": { $exists: true } }).select("name proBonusHistory");
      const allHistory = [];
      users.forEach((user) => {
        user.proBonusHistory.forEach((entry) => {
          allHistory.push({ userName: user.name, fromUser: entry.fromUser, baseAmount: entry.baseAmount, amount: entry.amount, date: entry.date });
        });
      });
      res.status(200).json({ message: "All Pro Bonus Income history fetched successfully", total: allHistory.length, data: allHistory });
    } catch (err) {
      res.status(500).json({ message: "Error fetching Pro Bonus history", error: err.message });
    }
  },

  adminUpdateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, phone, email, walletBalance, fundBalance, password, txnpass, isActivated, nftPurchaseDate, totalInvested, stakingPrincipal, roiPercent } = req.body;

      const user = await UserModel.findOne({ userId });
      if (!user) return errorResponse(res, "User not found", 404);

      const changes = {};

      if (name && user.name !== name) { changes.name = { oldValue: user.name, newValue: name }; user.name = name; }

      if (totalInvested && user.totalInvested !== totalInvested) {
        changes.totalInvested = { oldValue: user.totalInvested, newValue: totalInvested };
        user.totalInvested = totalInvested;
        if (!user.referralGiven && user.referrer) {
          const referralPercent = INCOME_PLAN.sponsor.percent;
          if (referralPercent > 0) {
            const referralIncome = (totalInvested * referralPercent) / 100;
            const depositorCode = user.userId || String(user._id);
            await UserModel.findOneAndUpdate(
              { _id: user.referrer },
              {
                $inc: { totalProfitEarned: referralIncome, proBonusIncome: referralIncome, walletBalance: referralIncome, todayIncome: referralIncome },
                $push: { proBonusHistory: { fromUser: depositorCode, baseAmount: totalInvested, amount: referralIncome, date: new Date(), orderId: "admin-update" } },
              }
            );
            user.referralGiven = true;
          }
        }
      }

      if (stakingPrincipal !== undefined && user.stakingPrincipal !== Number(stakingPrincipal)) {
        changes.stakingPrincipal = { oldValue: user.stakingPrincipal, newValue: Number(stakingPrincipal) };
        user.stakingPrincipal = Number(stakingPrincipal);
      }

      if (roiPercent !== undefined && user.roiPercent !== Number(roiPercent)) {
        const newRoiPercent = Number(roiPercent);
        if (newRoiPercent < 0.5 || newRoiPercent > 1) return errorResponse(res, "ROI percent must be between 0.5 and 1", 400);
        changes.roiPercent = { oldValue: user.roiPercent, newValue: newRoiPercent };
        user.roiPercent = newRoiPercent;
      }

      if (phone && user.phone !== phone) { changes.phone = { oldValue: user.phone, newValue: phone }; user.phone = phone; }
      if (email && user.email !== email) { changes.email = { oldValue: user.email, newValue: email }; user.email = email; }
      if (walletBalance !== undefined && user.walletBalance !== walletBalance) { changes.walletBalance = { oldValue: user.walletBalance, newValue: walletBalance }; user.walletBalance = walletBalance; }
      if (fundBalance !== undefined && user.fundBalance !== fundBalance) { changes.fundBalance = { oldValue: user.fundBalance, newValue: fundBalance }; user.fundBalance = fundBalance; }
      if (txnpass && user.txnpass !== txnpass) { changes.txnpass = { oldValue: user.txnpass, newValue: txnpass }; user.txnpass = txnpass; }
      if (password) { changes.password = { oldValue: "********", newValue: "********" }; user.password = password; }
      if (typeof isActivated === "boolean") user.isActivated = isActivated;

      if (nftPurchaseDate && user.nfts.length > 0) {
        const oldDate = user.nfts[0].purchasedAt;
        const newDate = new Date(nftPurchaseDate);
        if (String(oldDate) !== String(newDate)) {
          changes["nfts[0].purchasedAt"] = { oldValue: oldDate, newValue: newDate };
          user.nfts[0].purchasedAt = newDate;
        }
      }

      await logAdminUpdateHistory(userId, changes);
      await user.save();
      return successResponse(res, "User Updated Successfully");
    } catch (error) {
      console.log("Error Updating user", error);
      return errorResponse(res, "Internal Server Error");
    }
  },

  getAdminUpdateHistory: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const total = await AdminUpdateHistory.countDocuments();
      const history = await AdminUpdateHistory.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      return successResponse(res, "History fetched", { total, page: parseInt(page), pages: Math.ceil(total / limit), history });
    } catch (error) {
      return errorResponse(res, "Internal Server Error");
    }
  },

  stopRoIIncome: async (req, res) => {
    try {
      const { userId } = req.params;
      const { roistatus } = req.body;
      const user = await UserModel.findOne({ userId });
      if (!user) return errorResponse(res, "User not found", 404);
      user.stopROIIncome = roistatus;
      await user.save();
      return successResponse(res, "Roi status Updated Successfully");
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },

  updateRoiPercent: async (req, res) => {
    try {
      const { userId } = req.params;
      const newRoiPercent = Number(req.body.roiPercent);
      if (Number.isNaN(newRoiPercent) || newRoiPercent < 0.5 || newRoiPercent > 1)
        return errorResponse(res, "ROI percent must be between 0.5 and 1", 400);
      const user = await UserModel.findOne({ userId });
      if (!user) return errorResponse(res, "User not found", 404);
      user.roiPercent = newRoiPercent;
      await user.save();
      return successResponse(res, "ROI percent updated successfully", { userId: user.userId, roiPercent: user.roiPercent });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },

  getRoiInomestatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await UserModel.findOne({ userId }).select("stopROIIncome userId");
      if (!user) return errorResponse(res, "User not found", 404);
      return successResponse(res, "Roi status fetch Successfully", user);
    } catch (error) {
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },
};

export { userController };
