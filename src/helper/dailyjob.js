import cron from "node-cron";
import fs from "fs";
import path from "path";
import { calculateDailyIncome } from "../incomecalculation/retunonequity.js";
import { resetDailyIncomes } from "./resetdailyincome.js";
import { evaluateAllUsersRankRewards } from "../incomecalculation/rewardIncome.js";

const logFilePath = path.resolve("lastJobRunDate.txt");

const hasJobRunToday = () => {
  if (!fs.existsSync(logFilePath)) return false;
  const lastRunDate = fs.readFileSync(logFilePath, "utf-8");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return lastRunDate === today;
};

const updateLastRunDate = () => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  fs.writeFileSync(logFilePath, today, "utf-8");
};

const runDailyJob = async () => {
  const today = new Date().getDay();

  if (today === 0 || today === 6) {
    console.log("Weekend skip: no income job today.");
    return;
  }

  if (hasJobRunToday()) {
    console.log("Daily job already executed today, skipping.");
    return;
  }

  await resetDailyIncomes();
  await calculateDailyIncome();
  await evaluateAllUsersRankRewards();

  updateLastRunDate();
};

let isRunning = false;

cron.schedule("0 6 * * *", async () => {
  if (isRunning) {
    console.log("Daily job already running, skipping.");
    return;
  }

  isRunning = true;
  try {
    await runDailyJob();
    console.log("Daily job completed.");
  } catch (error) {
    console.error("Daily job error:", error);
  } finally {
    isRunning = false;
  }
}, {
  timezone: "Asia/Kolkata",
});
