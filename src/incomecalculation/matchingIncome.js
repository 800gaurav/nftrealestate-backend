import { INCOME_PLAN } from "../config/plans.js";
import { UserModel } from "../models/user.model.js";

const getDailyMatchingCap = (user) => {
  const matching = INCOME_PLAN.matching || {};
  return Number(user.totalInvested || 0) >= 100
    ? Number(matching.hundredDollarIdDailyCap || 100)
    : Number(matching.dailyCap || 50);
};

// Left/Right mein kitni active IDs hain count karo
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

const creditMatchingIncome = async (user) => {
  if (!user.isActivated) return;

  let left = Number(user.leftCarry || 0);
  let right = Number(user.rightCarry || 0);
  const cap = getDailyMatchingCap(user);
  const remainingCap = Math.max(cap - Number(user.todayMatchingIncome || 0), 0);
  if (remainingCap <= 0 || left <= 0 || right <= 0) return;

  const percent = Number(INCOME_PLAN.matching?.percent || 10) / 100;
  let matchedBusiness = 0;

  if (!user.isBinaryStarted) {
    // Active ID count se 2:1 check karo
    const leftCount = await countActiveIds(user._id, "left");
    const rightCount = await countActiveIds(user._id, "right");

    const twoOneCondition =
      (leftCount >= 2 && rightCount >= 1) ||
      (rightCount >= 2 && leftCount >= 1);

    if (!twoOneCondition) return; // condition poori nahi hui, wait karo

    user.isBinaryStarted = true;
  }

  // 1:1 matching on carry amounts
  const oneToOneBusiness = Math.min(left, right);
  matchedBusiness = oneToOneBusiness;
  left -= oneToOneBusiness;
  right -= oneToOneBusiness;

  const income = Math.min(matchedBusiness * percent, remainingCap);
  if (income > 0) {
    user.walletBalance += income;
    user.todayIncome += income;
    user.totalProfitEarned += income;
    user.matchingIncome += income;
    user.todayMatchingIncome += income;
    user.todaypair += 1;
  }

  user.leftCarry = left;
  user.rightCarry = right;
  await user.save();
};

export const updateBinaryBusinessAndMatching = async (buyerId, businessAmount) => {
  let current = await UserModel.findById(buyerId).select("placementParent");
  const amount = Number(businessAmount || 0);
  if (!current || amount <= 0) return;

  while (current?.placementParent) {
    const upliner = await UserModel.findById(current.placementParent).select(
      "leftChild rightChild leftTeamSp rightTeamSp leftCarry rightCarry isActivated isBinaryStarted todaypair todayIncome walletBalance totalProfitEarned totalInvested matchingIncome todayMatchingIncome placementParent"
    );
    if (!upliner) break;

    const currentId = String(current._id);
    if (String(upliner.leftChild || "") === currentId) {
      upliner.leftTeamSp += amount;
      upliner.leftCarry += amount;
    } else if (String(upliner.rightChild || "") === currentId) {
      upliner.rightTeamSp += amount;
      upliner.rightCarry += amount;
    }

    await creditMatchingIncome(upliner);
    current = upliner;
  }
};

// Daily job ke liye - saare active users ki matching recalculate karo
export const runDailyMatchingForAllUsers = async () => {
  const users = await UserModel.find({ isActivated: true }).select(
    "leftChild rightChild leftCarry rightCarry isActivated isBinaryStarted todaypair todayIncome walletBalance totalProfitEarned totalInvested matchingIncome todayMatchingIncome placementParent"
  );
  for (const user of users) {
    if (Number(user.leftCarry || 0) > 0 && Number(user.rightCarry || 0) > 0) {
      await creditMatchingIncome(user);
    }
  }
};
