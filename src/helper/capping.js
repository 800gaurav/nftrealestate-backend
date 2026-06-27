import { UserModel } from "../models/user.model.js";
import { INCOME_PLAN } from "../config/plans.js";

export const getAvailableIncome = async (userId, incomeType) => {
  const user = await UserModel.findById(userId);
  if (!user) return 0;

  const totalInvested = user.totalInvested || 0;
  const stakingPrincipal = user.stakingPrincipal || ((totalInvested * Number(INCOME_PLAN.joining?.percentOfJoiningAmount || 40)) / 100);

  // Caps
  const workingCap = 2 * totalInvested;
  const nonWorkingCap = 2 * stakingPrincipal;

  // Current income
  const currentWorking =
    (user.proBonusIncome || 0) +
    (user.matchingIncome || 0) +
    (user.rankRewardIncome || 0);

  const currentNonWorking =
    (user.roiIncome || 0);

  if (incomeType === "working") return Math.max(workingCap - currentWorking, 0);
  if (incomeType === "nonWorking") return Math.max(nonWorkingCap - currentNonWorking, 0);

  return 0;
};
