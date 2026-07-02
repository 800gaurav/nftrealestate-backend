import { UserModel } from "../../models/user.model.js";

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getLocalDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mergeMatchingRowsByDay = (rows = []) => {
  const merged = new Map();
  const result = [];

  rows.forEach((row) => {
    if (row.type !== "matching") {
      result.push(row);
      return;
    }

    const key = `${row.userId}-${getLocalDateKey(row.date)}`;
    const existing = merged.get(key);
    if (!existing) {
      const copy = { ...row };
      merged.set(key, copy);
      result.push(copy);
      return;
    }

    existing.amount += Number(row.amount || 0);
    existing.baseAmount += Number(row.baseAmount || 0);
    existing.matchedBusiness = Number(existing.matchedBusiness || 0) + Number(row.matchedBusiness || row.baseAmount || 0);
    existing.leftCarryBefore = Math.max(Number(existing.leftCarryBefore || 0), Number(row.leftCarryBefore || 0));
    existing.rightCarryBefore = Math.max(Number(existing.rightCarryBefore || 0), Number(row.rightCarryBefore || 0));
    existing.date = row.date || existing.date;
  });

  return result;
};

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

  incomeHistoryReport: async (req, res) => {
    try {
      let { page = 1, limit = 50, search = "", type = "", from = "", to = "" } = req.query;
      page = Math.max(Number(page) || 1, 1);
      limit = Math.min(Math.max(Number(limit) || 50, 1), 200);

      const query = search
        ? { $or: [{ userId: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }] }
        : {};

      const fromDate = toDate(from);
      const toDateValue = toDate(to);
      if (toDateValue) toDateValue.setHours(23, 59, 59, 999);

      const users = await UserModel.find(query)
        .select("userId name email roiIncomeHistory proBonusHistory matchingIncomeHistory teamBusinessHistory")
        .lean();

      const rows = [];
      const pushRow = (user, entry, incomeType, label, extra = {}) => {
        const entryDate = toDate(entry?.date);
        if (!entryDate) return;
        if (type && incomeType !== type) return;
        if (fromDate && entryDate < fromDate) return;
        if (toDateValue && entryDate > toDateValue) return;

        rows.push({
          userId: user.userId,
          name: user.name,
          email: user.email,
          type: incomeType,
          label,
          amount: Number(entry.amount || 0),
          baseAmount: Number(entry.baseAmount || entry.matchedBusiness || 0),
          fromUser: entry.fromUser || "",
          referredBy: entry.referredBy || "",
          date: entryDate,
          ...extra,
        });
      };

      users.forEach((user) => {
        (user.roiIncomeHistory || []).forEach((entry) =>
          pushRow(user, entry, "staking", "Staking Income")
        );
        (user.proBonusHistory || []).forEach((entry) =>
          pushRow(user, entry, "sponsor", "Sponsor Income")
        );
        (user.matchingIncomeHistory || []).forEach((entry) =>
          pushRow(user, entry, "matching", "Binary Matching Income", {
            leftCarryBefore: entry.leftCarryBefore || 0,
            rightCarryBefore: entry.rightCarryBefore || 0,
            matchedBusiness: entry.matchedBusiness || 0,
          })
        );
        (user.teamBusinessHistory || []).forEach((entry) =>
          pushRow(user, entry, "teamBusiness", "Team Business Income")
        );
      });

      const mergedRows = mergeMatchingRowsByDay(rows);
      mergedRows.sort((a, b) => new Date(b.date) - new Date(a.date));

      const total = mergedRows.length;
      const pagedRows = mergedRows.slice((page - 1) * limit, page * limit);
      const totals = mergedRows.reduce(
        (acc, row) => {
          acc.all += row.amount;
          acc[row.type] = (acc[row.type] || 0) + row.amount;
          return acc;
        },
        { all: 0, staking: 0, sponsor: 0, matching: 0, teamBusiness: 0 }
      );

      return res.status(200).json({
        success: true,
        message: "Income history report fetched",
        data: {
          report: pagedRows,
          total,
          page,
          pages: Math.ceil(total / limit) || 1,
          totals,
        },
      });
    } catch (error) {
      console.error("incomeHistoryReport error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch income history report" });
    }
  },
};

export { incomehistoryController };
