import axios from "axios";
import { DepositModel } from "../../models/deposit.model.js";
import { UserModel } from "../../models/user.model.js";
import { successResponse, errorResponse } from "../../utils/api-response.js";
import { OXAPAY_MERCHANT_KEY } from "../../config/index.js";
import { getUplines } from "../../helper/getUpLines.js";
import { evaluateAndApplyRankReward } from "../../incomecalculation/rewardIncome.js";
import { updateBinaryBusinessAndMatching } from "../../incomecalculation/matchingIncome.js";
import { INCOME_PLAN, SERVICE_PLANS } from "../../config/plans.js";

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const creditSponsorIncome = async ({ user, packageAmount, orderId }) => {
  if (!user?.referrer) return;

  const referralPercent = Number(INCOME_PLAN.sponsor?.percent || 0);
  if (referralPercent <= 0) return;

  const referralIncome = round2((Number(packageAmount || 0) * referralPercent) / 100);
  if (referralIncome <= 0) return;

  const depositorCode = user.userId || String(user._id);
  await UserModel.findOneAndUpdate(
    { _id: user.referrer },
    {
      $inc: {
        totalProfitEarned: referralIncome,
        proBonusIncome: referralIncome,
        walletBalance: referralIncome,
        todayIncome: referralIncome,
      },
      $push: {
        proBonusHistory: {
          fromUser: depositorCode,
          baseAmount: packageAmount,
          amount: referralIncome,
          date: new Date(),
          orderId,
        },
      },
    }
  );
};

const getPackageFromRequest = ({ packageCode, amount }) => {
  if (packageCode) {
    return SERVICE_PLANS.find((plan) => plan.code === packageCode);
  }
  const numericAmount = Number(amount);
  return SERVICE_PLANS.find((plan) => Number(plan.price) === numericAmount);
};

export const getDepositHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findOne({ userId });
    if (!user) return errorResponse(res, "User not found", 404);
    const deposits = await DepositModel.find({ userId: user._id }).sort({ date: -1 });
    return successResponse(res, "Deposit history fetched", deposits);
  } catch (err) {
    console.error("Deposit history error:", err);
    return errorResponse(res, "Error fetching deposit history", 500);
  }
};

export const getAllDepositHistory = async (req, res) => {
  try {
    const deposits = await DepositModel.find()
      .populate({ path: "userId", select: "userId email" })
      .sort({ date: -1 });

    const result = deposits.map(dep => ({
      _id: dep._id,
      userId: dep.userId?.userId || "",
      email: dep.userId?.email || "",
      coin: dep.coin,
      amount: dep.amount,
      address: dep.address,
      txnId: dep.txnId,
      date: dep.date,
      status: dep.status
    }));

    return successResponse(res, "All deposit history fetched", result);
  } catch (err) {
    console.error("All deposit history error:", err);
    return errorResponse(res, "Error fetching all deposits", 500);
  }
};

export const initiatePayment = async (req, res) => {
  try {
    const { amount, packageCode, payFromFundWallet } = req.body;
    const currentUser = req.currentUser;

    if (!amount || !currentUser) {
      return res.status(400).json({ error: "Amount and user are required." });
    }

    const selectedPackage = getPackageFromRequest({ packageCode, amount });
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid registration package: $12, $25, $50, or $100."
      });
    }

    const packageAmount = Number(selectedPackage.price);
    const stakingAmount = round2((packageAmount * Number(INCOME_PLAN.joining.percentOfJoiningAmount || 40)) / 100);
    const planDailyPercent = Number(selectedPackage.dailyPercent || 0.5);

    const user = await UserModel.findOne({ _id: currentUser._id });

    // --- Fund Wallet Flow ---
    if (payFromFundWallet) {
      if (user.fundBalance < packageAmount) {
        return res.status(400).json({ success: false, message: "Insufficient Fund Wallet balance." });
      }

      user.fundBalance -= packageAmount;
      user.fundWalletHistory = user.fundWalletHistory || [];
      user.fundWalletHistory.push({
        type: "debit",
        amount: packageAmount,
        note: `Package purchase: ${selectedPackage.title || selectedPackage.code}`,
        balanceAfter: user.fundBalance,
        date: new Date(),
      });
      user.totalInvested += packageAmount;
      user.stakingPrincipal += stakingAmount;
      user.roiPercent = planDailyPercent;
      user.stopROIIncome = false;
      user.isActivated = true;
      await user.save();
      await updateBinaryBusinessAndMatching(user._id, packageAmount);
      await creditSponsorIncome({ user, packageAmount, orderId: `fund-wallet-${Date.now()}` });

      return res.status(200).json({ success: true, message: "Package purchased successfully from Fund Wallet." });
    }

    // --- OxaPay Flow ---
    const orderid = `ORD-${Date.now()}`;
    const response = await axios.post(
      "https://api.oxapay.com/v1/payment/invoice",
      {
        amount: packageAmount,
        currency: "USD",
        lifetime: 15,
        under_paid_coverage: 2.5,
        to_currency: "USDT",
        auto_withdrawal: false,
        mixed_payment: true,
        callback_url: "https://backend.jupitertoken.us/api/v1/user/oxapay/payment/callback",
        return_url: "https://backend.jupitertoken.us/api/v1/user/oxapay/payment/return",
        email: user.email,
        order_id: orderid,
        thanks_message: "",
        description: selectedPackage.title,
        sandbox: false
      },
      {
        headers: {
          "merchant_api_key": OXAPAY_MERCHANT_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    await DepositModel.create({
      userId: currentUser._id,
      amount: packageAmount,
      currency: "USDT",
      orderId: orderid,
      purpose: "package",
      packageCode: selectedPackage.code,
      packageTitle: selectedPackage.title,
      packageAmount,
      stakingAmount,
      planDailyPercent,
      status: "pending"
    });

    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("Payment initiation error:", error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error?.response?.data || error.message
    });
  }
};

export const oxapayCallback = async (req, res) => {
  try {
    const data = req.body;
    const { order_id, status, txs } = data;
    const transaction = txs?.[0] || {};

    console.log("🔔 Callback received:", order_id, status);

    if (!order_id || !transaction) {
      return res.status(400).send("Invalid data");
    }

    let newStatus = "pending";
    if (status === "Paid") newStatus = "success";
    else if (status === "Paying") newStatus = "paying";

    const existingDeposit = await DepositModel.findOne({ orderId: order_id });
    if (!existingDeposit) {
      console.log(`⚠️ No payment record found with txnId: ${order_id}`);
      return res.status(400).send("Invalid order");
    }

    if (existingDeposit.status === "success") {
      console.log(`⏭️ Payment ${order_id} already processed, skipping...`);
      return res.status(200).send("ok");
    }

    existingDeposit.status = newStatus;
    existingDeposit.confirmedAmount = transaction.sent_amount;
    existingDeposit.txHash = transaction.tx_hash;
    existingDeposit.network = transaction.network;
    existingDeposit.updatedAt = new Date();
    await existingDeposit.save();

    if (newStatus === "success" && existingDeposit?.userId) {
      const paidAmount = Number(transaction.fiat_amount || transaction.price_amount || transaction.sent_amount || existingDeposit.amount || 0);
      const packageAmount = Number(existingDeposit.packageAmount || existingDeposit.amount || paidAmount);
      const stakingAmount = Number(
        existingDeposit.stakingAmount ||
        round2((packageAmount * Number(INCOME_PLAN.joining.percentOfJoiningAmount || 40)) / 100)
      );
      const matchedPackage = SERVICE_PLANS.find(
        (plan) => plan.code === existingDeposit.packageCode || Number(plan.price) === packageAmount
      );
      const planDailyPercent = Number(existingDeposit.planDailyPercent || matchedPackage?.dailyPercent || 0.5);
      const isPackagePayment = existingDeposit.purpose === "package";
      const update = isPackagePayment
        ? {
            $inc: { totalInvested: packageAmount, stakingPrincipal: stakingAmount, walletBalance: stakingAmount },
            $set: { isActivated: true, stopROIIncome: false, roiPercent: planDailyPercent }
          }
        : {
            $inc: { fundBalance: paidAmount },
            $set: { isActivated: true }
          };

      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: existingDeposit.userId },
        update,
        { new: true }
      );

      if (updatedUser) {
        console.log(`💰 User ${updatedUser._id} updated: +${transaction.sent_amount}`);
        if (isPackagePayment) {
          await updateBinaryBusinessAndMatching(updatedUser._id, packageAmount);
        }

        const uplines = await getUplines(updatedUser._id, 20);
        for (const uplineId of uplines) {
          await evaluateAndApplyRankReward(uplineId);
        }

        if (isPackagePayment) {
          await creditSponsorIncome({ user: updatedUser, packageAmount, orderId: order_id });
        }
      }
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error("❌ Callback error:", error.message);
    return res.status(500).json({ success: false, message: "Callback handling failed" });
  }
};

export const oxapayReturn = (req, res) => {
  const { order_id, status } = req.query;
  return res.send(`
    <html>
      <body>
        <h2>Payment Status: ${status}</h2>
        <p>Your order ID: ${order_id}</p>
        <p><a href="/">Go back to home</a></p>
      </body>
    </html>
  `);
};
