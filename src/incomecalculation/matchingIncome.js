import { INCOME_PLAN } from "../config/plans.js";
import { UserModel } from "../models/user.model.js";

const getDailyMatchingCap = (user) => {
  const matching = INCOME_PLAN.matching || {};
  return Number(user.totalInvested || 0) >= 100
    ? Number(matching.hundredDollarIdDailyCap || 100)
    : Number(matching.dailyCap || 50);
};

const isSameLocalDay = (a, b) => {
  const first = new Date(a);
  const second = new Date(b);
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
};

const countActiveIds = async (rootId, side) => {
  const root = await UserModel.findById(rootId).select("leftChild rightChild");
  if (!root) return 0;
  const childId = side === "left" ? root.leftChild : root.rightChild;
  if (!childId) return 0;

  let count = 0;
  const queue = [childId];
  while (queue.length > 0) {
    const id = queue.shift();
    const node = await UserModel.findById(id).select("isActivated leftChild rightChild");
    if (!node) continue;
    if (node.isActivated) count++;
    if (node.leftChild) queue.push(node.leftChild);
    if (node.rightChild) queue.push(node.rightChild);
  }
  return count;
};

const getLegStats = async (rootId, side) => {
  const root = await UserModel.findById(rootId).select("leftChild rightChild");
  if (!root) return { activeCount: 0, business: 0 };

  const childId = side === "left" ? root.leftChild : root.rightChild;
  if (!childId) return { activeCount: 0, business: 0 };

  let activeCount = 0;
  let business = 0;
  const queue = [childId];

  while (queue.length > 0) {
    const id = queue.shift();
    const node = await UserModel.findById(id).select("isActivated totalInvested leftChild rightChild");
    if (!node) continue;

    if (node.isActivated) {
      activeCount += 1;
      business += Number(node.totalInvested || 0);
    }
    if (node.leftChild) queue.push(node.leftChild);
    if (node.rightChild) queue.push(node.rightChild);
  }

  return { activeCount, business };
};

const creditMatchingIncome = async (user) => {
  if (!user.isActivated) return;

  let left = Number(user.leftCarry || 0);
  let right = Number(user.rightCarry || 0);
  if (left <= 0 || right <= 0) return;

  const cap = getDailyMatchingCap(user);
  const remainingCap = Math.max(cap - Number(user.todayMatchingIncome || 0), 0);
  if (remainingCap <= 0) return;

  const percent = Number(INCOME_PLAN.matching?.percent || 10) / 100;

  if (!user.isBinaryStarted) {
    const leftCount = await countActiveIds(user._id, "left");
    const rightCount = await countActiveIds(user._id, "right");
    const twoOneCondition =
      (leftCount >= 2 && rightCount >= 1) ||
      (rightCount >= 2 && leftCount >= 1);
    if (!twoOneCondition) return;
    user.isBinaryStarted = true;
  }

  if (percent <= 0) return;

  const matched = Math.min(left, right, remainingCap / percent);
  const income = matched * percent;
  const leftCarryAfter = left - matched;
  const rightCarryAfter = right - matched;

  if (income > 0) {
    user.walletBalance += income;
    user.todayIncome += income;
    user.totalProfitEarned += income;
    user.matchingIncome += income;
    user.todayMatchingIncome += income;
    user.todaypair += 1;
    user.matchingIncomeHistory = user.matchingIncomeHistory || [];
    const now = new Date();
    const todayHistory = user.matchingIncomeHistory.find((entry) => isSameLocalDay(entry.date, now));
    if (todayHistory) {
      todayHistory.amount = Number(todayHistory.amount || 0) + income;
      todayHistory.matchedBusiness = Number(todayHistory.matchedBusiness || 0) + matched;
      todayHistory.leftCarryBefore = Math.max(Number(todayHistory.leftCarryBefore || 0), left);
      todayHistory.rightCarryBefore = Math.max(Number(todayHistory.rightCarryBefore || 0), right);
      todayHistory.leftCarryAfter = leftCarryAfter;
      todayHistory.rightCarryAfter = rightCarryAfter;
      todayHistory.percent = percent * 100;
      todayHistory.date = now;
    } else {
      user.matchingIncomeHistory.push({
        amount: income,
        matchedBusiness: matched,
        leftCarryBefore: left,
        rightCarryBefore: right,
        leftCarryAfter,
        rightCarryAfter,
        percent: percent * 100,
        date: now,
      });
    }
  }

  user.leftCarry = leftCarryAfter;
  user.rightCarry = rightCarryAfter;
  await user.save();
};

export const updateBinaryBusinessAndMatching = async (buyerId, businessAmount) => {
  let current = await UserModel.findById(buyerId).select("placementParent");
  const amount = Number(businessAmount || 0);
  if (!current || amount <= 0) return;

  while (current?.placementParent) {
    const upliner = await UserModel.findById(current.placementParent).select(
      "leftChild rightChild leftBusiness rightBusiness leftCarry rightCarry isActivated isBinaryStarted todaypair todayIncome walletBalance totalProfitEarned totalInvested matchingIncome todayMatchingIncome matchingIncomeHistory placementParent"
    );
    if (!upliner) break;

    const currentId = String(current._id);
    if (String(upliner.leftChild || "") === currentId) {
      upliner.leftBusiness = (upliner.leftBusiness || 0) + amount;
      upliner.leftCarry = (upliner.leftCarry || 0) + amount;
    } else if (String(upliner.rightChild || "") === currentId) {
      upliner.rightBusiness = (upliner.rightBusiness || 0) + amount;
      upliner.rightCarry = (upliner.rightCarry || 0) + amount;
    }

    await upliner.save();
    await creditMatchingIncome(upliner);
    current = upliner;
  }
};

export const runDailyMatchingForAllUsers = async () => {
  const users = await UserModel.find({ isActivated: true, isDemo: { $ne: true } }).select(
    "leftChild rightChild leftBusiness rightBusiness leftCarry rightCarry isActivated isBinaryStarted todaypair todayIncome walletBalance totalProfitEarned totalInvested matchingIncome todayMatchingIncome matchingIncomeHistory placementParent"
  );
  for (const user of users) {
    const leftStats = await getLegStats(user._id, "left");
    const rightStats = await getLegStats(user._id, "right");

    const storedLeftBusiness = Number(user.leftBusiness || 0);
    const storedRightBusiness = Number(user.rightBusiness || 0);
    const leftDelta = Math.max(leftStats.business - storedLeftBusiness, 0);
    const rightDelta = Math.max(rightStats.business - storedRightBusiness, 0);

    if (leftDelta > 0 || rightDelta > 0) {
      user.leftBusiness = Math.max(storedLeftBusiness, leftStats.business);
      user.rightBusiness = Math.max(storedRightBusiness, rightStats.business);
      user.leftCarry = Number(user.leftCarry || 0) + leftDelta;
      user.rightCarry = Number(user.rightCarry || 0) + rightDelta;
      await user.save();
    }

    if (Number(user.leftCarry || 0) > 0 && Number(user.rightCarry || 0) > 0) {
      await creditMatchingIncome(user);
    }
  }
};
