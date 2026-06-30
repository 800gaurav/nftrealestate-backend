import { UserModel } from "../../models/user.model.js";

const incomehistoryController = {
  proBonusHistory: async (req, res) => {
    try {
      const users = await UserModel.find({ "proBonusHistory.0": { $exists: true } })
        .select("userId name proBonusHistory")
        .lean();

      const sponsorHistory = users.flatMap((user) =>
        user.proBonusHistory.map((entry) => ({
          userId: user.userId,
          name: user.name,
          fromUser: entry.fromUser,
          baseAmount: entry.baseAmount,
          amount: entry.amount,
          date: entry.date,
        }))
      );

      res.status(200).json({
        success: true,
        message: "All sponsor income history fetched successfully",
        data: sponsorHistory,
      });
    } catch (error) {
      console.error("Error fetching sponsor income history:", error);
      res.status(500).json({ success: false, message: "Failed to fetch sponsor income history" });
    }
  },

  getUserNetwork: async (req, res) => {
    try {
      const { userId } = req.params;

      const rootUser = await UserModel.findOne({ userId }).select("_id userId");
      if (!rootUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const levels = {};
      let currentLevelUsers = [rootUser._id];

      for (let level = 1; level <= 20; level++) {
        const users = await UserModel.find({ referrer: { $in: currentLevelUsers } }).select("_id email userId referrer");
        if (users.length === 0) break;

        levels[`level_${level}`] = {
          count: users.length,
          users: users.map((u) => ({ _id: u._id, email: u.email, userId: u.userId })),
        };

        currentLevelUsers = users.map((u) => u._id);
      }

      return res.json({ success: true, message: "User network fetched", data: levels });
    } catch (error) {
      console.error("Network Error:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // Admin: full income report per user
  userIncomeReport: async (req, res) => {
    try {
      let { page = 1, limit = 20, search = "" } = req.query;
      page = Number(page);
      limit = Number(limit);

      const query = search
        ? { $or: [{ userId: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }] }
        : {};

      const total = await UserModel.countDocuments(query);
      const users = await UserModel.find(query)
        .select("userId name email walletBalance roiIncome proBonusIncome matchingIncome totalProfitEarned todayIncome totalInvested stakingPrincipal isActivated createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const report = users.map((u) => ({
        userId: u.userId,
        name: u.name,
        email: u.email,
        isActivated: u.isActivated,
        totalInvested: u.totalInvested || 0,
        stakingPrincipal: u.stakingPrincipal || 0,
        stakingIncome: u.roiIncome || 0,
        sponsorIncome: u.proBonusIncome || 0,
        matchingIncome: u.matchingIncome || 0,
        rankRewardIncome: 0,
        totalIncome:
          (u.roiIncome || 0) +
          (u.proBonusIncome || 0) +
          (u.matchingIncome || 0),
        walletBalance: u.walletBalance || 0,
        todayIncome: u.todayIncome || 0,
        createdAt: u.createdAt,
      }));

      return res.status(200).json({
        success: true,
        message: "User income report fetched",
        data: { report, total, page, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("userIncomeReport error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch income report" });
    }
  },
};

export { incomehistoryController };
