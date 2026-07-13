import { UserModel } from "../../models/user.model.js"
import { buildTree } from "../../utils/build-tree.js";
import { errorResponse, successResponse } from "../../utils/api-response.js"
import mongoose from "mongoose";

const getLocalDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mergeMatchingHistoryByDay = (history = []) => {
  const merged = new Map();

  history.forEach((entry) => {
    const key = getLocalDateKey(entry.date);
    if (!key) return;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        date: entry.date,
        amount: Number(entry.amount || 0),
        matchedBusiness: Number(entry.matchedBusiness || 0),
        leftCarryBefore: Number(entry.leftCarryBefore || 0),
        rightCarryBefore: Number(entry.rightCarryBefore || 0),
        leftCarryAfter: Number(entry.leftCarryAfter || 0),
        rightCarryAfter: Number(entry.rightCarryAfter || 0),
        percent: Number(entry.percent || 0),
      });
      return;
    }

    existing.amount += Number(entry.amount || 0);
    existing.matchedBusiness += Number(entry.matchedBusiness || 0);
    existing.leftCarryBefore = Math.max(existing.leftCarryBefore, Number(entry.leftCarryBefore || 0));
    existing.rightCarryBefore = Math.max(existing.rightCarryBefore, Number(entry.rightCarryBefore || 0));
    existing.leftCarryAfter = Number(entry.leftCarryAfter || existing.leftCarryAfter || 0);
    existing.rightCarryAfter = Number(entry.rightCarryAfter || existing.rightCarryAfter || 0);
    existing.percent = Number(entry.percent || existing.percent || 0);
    existing.date = entry.date || existing.date;
  });

  return Array.from(merged.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
};

const profileController = {
  getLoggedinUserProfile: async (req, res) => {
    const user = await UserModel.findById(req.currentUser._id).select("-password");
    if (!user) return errorResponse(res, "User not found", 404);
    successResponse(res, "User data fetched successfully", user);
  },

  getReferralTree: async (req, res) => {
    const user = await UserModel.findById(req.currentUser._id).select("-password");
    if (!user) return errorResponse(res, "User not found", 404);
    const tree = await buildTree(user._id);
    successResponse(res, "Referral Tree fetched successfully", tree);
  },

  getLeftRightChild: async (req, res) => {
    try {
      const { userId } = req.params;
      const query = mongoose.Types.ObjectId.isValid(userId) ? { _id: userId } : { userId };
      const user = await UserModel.findOne(query).select("-password");
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const leftChild = user.leftChild
        ? await UserModel.findById(user.leftChild).select("_id userId name isActivated totalInvested walletBalance leftTeamSp rightTeamSp placementSide leftChild rightChild createdAt")
        : null;
      const rightChild = user.rightChild
        ? await UserModel.findById(user.rightChild).select("_id userId name isActivated totalInvested walletBalance leftTeamSp rightTeamSp placementSide leftChild rightChild createdAt")
        : null;

      const countSubtree = async (rootId) => {
        if (!rootId) return { total: 0, active: 0 };
        let total = 0, active = 0, queue = [rootId];
        const visited = new Set();
        while (queue.length > 0) {
          const members = await UserModel.find(
            { _id: { $in: queue } },
            "_id isActivated leftChild rightChild"
          ).lean();
          if (!members.length) break;

          total += members.length;
          active += members.filter(m => m.isActivated).length;
          
          const nextQueue = [];
          for (const m of members) {
            const idStr = String(m._id);
            if (visited.has(idStr)) continue;
            visited.add(idStr);
            if (m.leftChild) nextQueue.push(m.leftChild);
            if (m.rightChild) nextQueue.push(m.rightChild);
          }
          queue = nextQueue;
        }
        return { total, active };
      };

      const [
        userLeftTree, userRightTree,
        leftChildLeftTree, leftChildRightTree,
        rightChildLeftTree, rightChildRightTree
      ] = await Promise.all([
        countSubtree(user.leftChild),
        countSubtree(user.rightChild),
        countSubtree(leftChild?.leftChild),
        countSubtree(leftChild?.rightChild),
        countSubtree(rightChild?.leftChild),
        countSubtree(rightChild?.rightChild),
      ]);

      return res.json({
        success: true,
        data: {
          _id: user._id, userId: user.userId, name: user.name,
          isActivated: user.isActivated, totalInvested: user.totalInvested,
          walletBalance: user.walletBalance, leftTeamSp: user.leftTeamSp,
          rightTeamSp: user.rightTeamSp, placementSide: user.placementSide,
          createdAt: user.createdAt,
          leftTotal: userLeftTree.total,
          leftActive: userLeftTree.active,
          rightTotal: userRightTree.total,
          rightActive: userRightTree.active,
          leftChild: leftChild ? {
            ...leftChild.toObject(),
            leftTotal: leftChildLeftTree.total,
            leftActive: leftChildLeftTree.active,
            rightTotal: leftChildRightTree.total,
            rightActive: leftChildRightTree.active,
          } : null,
          rightChild: rightChild ? {
            ...rightChild.toObject(),
            leftTotal: rightChildLeftTree.total,
            leftActive: rightChildLeftTree.active,
            rightTotal: rightChildRightTree.total,
            rightActive: rightChildRightTree.active,
          } : null,
        }
      });
    } catch (error) {
      console.error("Tree fetch error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch tree" });
    }
  },

  userdashboarddetails: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await UserModel.findOne(
        { userId },
        "_id name email createdAt isActivated fundBalance walletBalance stakingWallet totalInvested stakingPrincipal roiPercent proBonusIncome roiIncome matchingIncome teamBusinessIncome todayIncome referralBonus leftBusiness rightBusiness totalProfitEarned roiIncomeHistory proBonusHistory matchingIncomeHistory teamBusinessHistory sponsor currentRank teamBusiness leftChild rightChild withdrawTRC_ADDRESS withdrawBEP_ADDRESS"
      ).lean();

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const [directReferrals, directActiveReferrals] = await Promise.all([
        UserModel.countDocuments({ referrer: user._id }),
        UserModel.countDocuments({ referrer: user._id, isActivated: true }),
      ]);

      // Count full placement subtree for left and right sides
      const countSubtree = async (rootId) => {
        if (!rootId) return { total: 0, active: 0, business: 0 };
        let total = 0, active = 0, business = 0, queue = [rootId];
        const visited = new Set();
        while (queue.length > 0) {
          const members = await UserModel.find(
            { _id: { $in: queue } },
            "_id isActivated totalInvested leftChild rightChild"
          ).lean();
          if (!members.length) break;

          total += members.length;
          active += members.filter(m => m.isActivated).length;
          business += members.reduce((sum, m) => sum + Number(m.totalInvested || 0), 0);
          
          const nextQueue = [];
          for (const m of members) {
            const idStr = String(m._id);
            if (visited.has(idStr)) continue;
            visited.add(idStr);
            if (m.leftChild) nextQueue.push(m.leftChild);
            if (m.rightChild) nextQueue.push(m.rightChild);
          }
          queue = nextQueue;
        }
        return { total, active, business };
      };

      const [leftTree, rightTree] = await Promise.all([
        countSubtree(user.leftChild),
        countSubtree(user.rightChild),
      ]);

      let totalTeamBusiness = 0;
      let totalDownlineMembers = 0;
      let totalActiveDownlineMembers = 0;
      let currentLevelUserIds = [user._id];

      for (let level = 1; level <= 20; level++) {
        const downlineUsers = await UserModel.find(
          { referrer: { $in: currentLevelUserIds } },
          "_id totalInvested isActivated"
        ).lean();
        if (downlineUsers.length === 0) break;
        totalTeamBusiness += downlineUsers.reduce((sum, u) => sum + (u.totalInvested || 0), 0);
        if (level > 1) {
          totalDownlineMembers += downlineUsers.length;
          totalActiveDownlineMembers += downlineUsers.filter(u => u.isActivated).length;
        }
        currentLevelUserIds = downlineUsers.map(u => u._id);
      }

      const totalTeamMembers = directReferrals + totalDownlineMembers;
      const totalActiveTeamMembers = directActiveReferrals + totalActiveDownlineMembers;
      const stakingIncome = user.roiIncome || 0;
      const sponsorIncome = user.proBonusIncome || 0;
      const matchingIncome = user.matchingIncome || 0;

      return res.status(200).json({
        success: true,
        data: {
          username: user.name,
          email: user.email,
          createdAt: user.createdAt,
          isActivated: user.isActivated,
          fundBalance: user.fundBalance,
          walletBalance: user.walletBalance,
          stakingWallet: user.stakingWallet || 0,
          totalInvested: user.totalInvested,
          stakingPrincipal: user.stakingPrincipal || 0,
          roiPercent: user.roiPercent || 0.5,
          rankRewardIncome: 0,
          currentRank: user.currentRank || null,
          totalTeamBusiness: leftTree.business + rightTree.business,
          leftTeamBusiness: leftTree.business,
          rightTeamBusiness: rightTree.business,
          leftTotal: leftTree.total,
          leftActive: leftTree.active,
          rightTotal: rightTree.total,
          rightActive: rightTree.active,
          directReferrals,
          directActiveReferrals,
          totalTeamMembers,
          totalActiveTeamMembers,
          workingIncome: sponsorIncome + matchingIncome,
          nonWorkingIncome: stakingIncome,
          sponsorIncome,
          proBonusIncome: sponsorIncome,
          teamBusinessIncome: user.teamBusinessIncome || 0,
          stakingIncome,
          roiIncome: stakingIncome,
          matchingIncome,
          todayIncome: user.todayIncome,
          totalProfitEarned: user.totalProfitEarned || sponsorIncome + stakingIncome + matchingIncome,
          roiIncomeHistory: user.roiIncomeHistory || [],
          proBonusHistory: user.proBonusHistory || [],
          matchingIncomeHistory: mergeMatchingHistoryByDay(user.matchingIncomeHistory || []),
          teamBusinessHistory: user.teamBusinessHistory || [],
          sponsor: user.sponsor || null,
          withdrawTRC_ADDRESS: user.withdrawTRC_ADDRESS || "",
          withdrawBEP_ADDRESS: user.withdrawBEP_ADDRESS || "",
        }
      });
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      return res.status(500).json({ success: false, message: "Internal server error", error });
    }
  },

  userDirectrefers: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await UserModel.findOne({ userId }).select("-password");
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const directReferrals = await UserModel.find({ referrer: user._id }).select("-password");
      res.status(200).json({ success: true, message: "Direct referrals fetched successfully", data: directReferrals });
    } catch (error) {
      console.error("Error fetching direct referrals:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  probonusIncomehistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await UserModel.findOne({ userId }).select("proBonusHistory");
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      const simplifiedHistory = user.proBonusHistory.map(entry => ({
        fromUser: entry.fromUser,
        baseAmount: entry.baseAmount,
        amount: entry.amount,
        date: entry.date,
      }));
      res.status(200).json({ success: true, message: "Pro Bonus Income fetched successfully", data: simplifiedHistory });
    } catch (error) {
      console.error("Error in fetching probonusIncome:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getDownlineLevels: async (req, res) => {
    try {
      const { userId } = req.params;
      const rootUser = await UserModel.findOne({ userId });
      if (!rootUser) return res.status(404).json({ success: false, message: "User not found" });

      const levelStats = [];
      let currentLevelUserIds = [rootUser._id];
      const levelInvestments = {};

      for (let level = 1; level <= 20; level++) {
        const downlineUsers = currentLevelUserIds.length > 0
          ? await UserModel.find({ referrer: { $in: currentLevelUserIds } }, "_id totalInvested")
          : [];

        const totalMembers = downlineUsers.length;
        const totalInvestment = downlineUsers.reduce((sum, u) => sum + (u.totalInvested || 0), 0);
        levelInvestments[level] = totalInvestment;

        let isQualified = level === 1 ||
          (level === 2 && levelInvestments[1] >= 3000) ||
          (level === 3 && levelInvestments[2] >= 8000) ||
          (level === 4 && levelInvestments[3] >= 20000) ||
          (level === 5 && levelInvestments[4] >= 40000) ||
          (level >= 6 && level <= 10 && levelInvestments[5] >= 80000) ||
          (level >= 11 && level <= 20 && levelInvestments[6] >= 120000);

        levelStats.push({ level, totalMembers, totalInvestment, status: isQualified ? "qualified" : "not qualified" });
        currentLevelUserIds = downlineUsers.map(u => u._id);
      }

      return res.json({ success: true, levels: levelStats });
    } catch (error) {
      console.error("Error in getDownlineLevels:", error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  },

  getLevelMembers: async (req, res) => {
    try {
      const { userId } = req.params;
      const { level } = req.query;
      const levelNum = parseInt(level);
      if (!userId || isNaN(levelNum)) return res.status(400).json({ success: false, message: "userId and level (number) are required" });

      const rootUser = await UserModel.findOne({ userId });
      if (!rootUser) return res.status(404).json({ success: false, message: "User not found" });

      let currentLevelUserIds = [rootUser._id];
      let targetUsers = [];

      for (let i = 1; i <= levelNum; i++) {
        const nextLevelUsers = await UserModel.find({ referrer: { $in: currentLevelUserIds } });
        if (i === levelNum) {
          targetUsers = nextLevelUsers.map(u => ({ name: u.name, userId: u.userId, totalInvested: u.totalInvested, createdAt: u.createdAt }));
          break;
        }
        currentLevelUserIds = nextLevelUsers.map(u => u._id);
        if (currentLevelUserIds.length === 0) break;
      }

      res.json({ success: true, level: levelNum, totalUsers: targetUsers.length, users: targetUsers });
    } catch (error) {
      console.error("Error fetching level members:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
}

export { profileController };
