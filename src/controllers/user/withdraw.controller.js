

import mongoose from "mongoose"
import { UserModel } from '../../models/user.model.js'
import { WithdrawModel } from '../../models/withdraw.model.js'
import { TransferHistoryModel } from '../../models/transferHistory.model.js'

import { successResponse, errorResponse } from '../../utils/api-response.js'
import { AdminEarningModel } from '../../models/adminearning.model.js'
import axios from "axios"

const OXAPAY_BASE_URL = process.env.OXAPAY_BASE_URL || "https://api.oxapay.com/v1";
const OXAPAY_MERCHANT_KEY = process.env.OXAPAY_MERCHANT_KEY;
const payout_api_key = process.env.payout_api_key;
const GENERAL_API_KEY = process.env.GENERAL_API_KEY;

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

export const requestWithdrawal = async (req, res) => {
  try {
    const currentUser = req.currentUser; // from auth middleware
    if (!currentUser) return errorResponse(res, "Unauthorized", 401);

    const { amount, coin } = req.body;
    if (!amount || !coin)
      return errorResponse(res, "Amount and coin are required", 400);
    
    const user = await UserModel.findById(currentUser._id).select("+walletBalance +email +withdrawTRC_ADDRESS +withdrawBEP_ADDRESS +totalInvested");
    if (!user) return errorResponse(res, "User not found", 404);
    
    // Business rules
    if (user.referralBonus === true && user.withdrawUnlock === false) {
    if (amount < 30) {
        return errorResponse(
            res,
            "You have received a $20 referral bonus. To withdraw, you must earn at least $10 more. Minimum withdrawal is $30.",
            400
        );
    }

    // ✅ First time unlock
    user.withdrawUnlock = true;
    await user.save();
}
    if (amount < 5) return errorResponse(res, "Minimum withdrawal amount is $5", 400);

    // Find user and balance

    // Prevent multiple pending withdraws
    const existingPending = await WithdrawModel.findOne({ userId: user._id, status: "pending" });
    if (existingPending) return errorResponse(res, "You already have a pending withdrawal request", 400);

    // Check if user has sufficient balance
    if (user.walletBalance < amount) {
      return errorResponse(res, "Insufficient balance", 400);
    }

    // Determine toAddress from user's saved addresses
    let toAddress = "";
    if (coin === "USDT.TRC20") toAddress = user.withdrawTRC_ADDRESS;
    else if (coin === "USDT.BEP20") toAddress = user.withdrawBEP_ADDRESS;
    else return errorResponse(res, "Invalid coin type", 400);

    if (!toAddress || toAddress === "0") {
      // Create invalid request so admin can view but mark invalid
      await WithdrawModel.create({
        // userId: user.userId,
         userId: user._id,          // ✅ ObjectId
         userUniqueId: user.userId, // ✅ ABC30521
        amount,
        coin,
        toAddress,
        serviceCharge: 0,
        payableAmount: 0,
        status: "invalid",
        remarks: "Invalid withdraw address"
      });
      return errorResponse(res, "Invalid wallet address configured. Contact support.", 400);
    }

    // Calculate flat service charge
    const serviceChargeRate = 0.10; // 10%
    const serviceCharge = round2(amount * serviceChargeRate);
    const payableAmount = round2(amount - serviceCharge);

    // Deduct immediately from user's walletBalance
    user.walletBalance = round2(user.walletBalance - amount);
    await user.save();

    // Save withdraw record
    const withdraw = await WithdrawModel.create({
      userId: user._id,
      userUniqueId: user.userId,
      amount,
      coin,
      toAddress,
      serviceCharge,
      payableAmount,
      status: "pending",
      remarks: "Withdrawal request created"
    });

    return successResponse(res, "Withdrawal request created successfully.", {
      withdrawId: withdraw._id,
      payableAmount,
      serviceCharge
    });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return errorResponse(res, "Failed to create withdrawal request", 500);
  }
};


const checkOxaPayBalance = async () => {
  try {
    const headers = {
      "Content-Type": "application/json",
      "general_api_key": GENERAL_API_KEY,
    };

    // Correct endpoint
    const url = 'https://api.oxapay.com/v1/general/account/balance'

    const res = await axios.get(url, { headers, timeout: 30000 });
    // Example: get USDT balance
    const usdtBalance = res.data?.data?.USDT || 0;


    return res.data;
  } catch (err) {

    return null;
  }
};

// export const callbackpaymentstatus = async (req, res) => {
//   try {
//     const data = req.body;
//     const { track_id, status } = data || {};

//     if (!track_id) {
//       return res.status(400).json({ message: "Invalid callback payload" });
//     }

//     // Withdrawal request find करो
//     const withdraw = await WithdrawModel.findOne({ trackId: track_id });

//     if (!withdraw) {
//       return res.status(404).json({ message: "Withdrawal not found" });
//     }

//     // Status mapping (OxaPay → DB)
//     let finalStatus = "pending";
//     if (status?.toLowerCase() === "confirmed" || status?.toLowerCase() === "confirming") {
//       finalStatus = "approved";
//     } else if (status?.toLowerCase() === "canceled" || status?.toLowerCase() === "rejected") {
//       finalStatus = "rejected";

//       // Refund user on failure → ab sirf walletBalance me refund hoga
//       // const user = await UserModel.findOne({ userId: withdraw.userId });
//       const user = await UserModel.findById(withdraw.userId);
//       if (user) {
//         user.walletBalance = round2((user.walletBalance || 0) + withdraw.amount);

//         // optional: agar tum invested balance bhi restore karna chahte ho
//         user.totalInvested = round2((user.totalInvested || 0) + withdraw.amount);

//         await user.save();
//         console.log("💰 Refunded user:", user._id, "amount:", withdraw.amount);
//       }
//     }

//     withdraw.status = finalStatus;
//     withdraw.remarks = `OxaPay callback: ${JSON.stringify(req.body).slice(0, 500)}`;
//     await withdraw.save();

//     console.log("✅ Withdrawal updated via callback:", withdraw);

//     return res.json({ message: "Callback processed", status: finalStatus });
//   } catch (err) {
//     console.error("❌ OxaPay Callback Error:", err);
//     return res.status(500).json({ message: "Callback error" });
//   }
// };

export const callbackpaymentstatus = async (req, res) => {
  try {
    console.log("🔥 FULL CALLBACK BODY:", req.body);

    const { track_id, status } = req.body;

    if (!track_id) {
      return res.status(400).json({ message: "Track ID missing" });
    }

    const withdraw = await WithdrawModel.findOne({ trackId: track_id });

    if (!withdraw) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    const lowerStatus = status?.toLowerCase();

    // 🔒 Prevent double processing
    if (withdraw.status === "approved" || withdraw.status === "rejected") {
      console.log("⚠️ Withdrawal already finalized:", withdraw.status);
      return res.status(200).json({ message: "Already processed" });
    }

    // ✅ ONLY confirmed = approved
    if (lowerStatus === "confirmed") {
      withdraw.status = "approved";
    }

    // ❌ Failed / Canceled = reject + refund
    else if (lowerStatus === "failed" || lowerStatus === "canceled") {

      withdraw.status = "rejected";

      const user = await UserModel.findById(withdraw.userId);

      if (user) {
        user.walletBalance = round2(user.walletBalance + withdraw.amount);
        await user.save();
        console.log("💰 Refunded user:", user._id);
      }
    }

    // 🟡 processing / confirming = keep pending
    else {
      withdraw.status = "pending";
    }

    withdraw.remarks = `Callback: ${JSON.stringify(req.body).slice(0, 500)}`;
    await withdraw.save();

    console.log("✅ Withdrawal updated to:", withdraw.status);

    return res.status(200).json({ message: "Callback processed" });

  } catch (error) {
    console.error("❌ Callback error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const approveWithdrawal = async (req, res) => {
  try {

    const adminUser = req.currentUser; // should be admin by middleware
    if (!adminUser || adminUser.role !== "admin") {
      console.log("❌ Not admin or missing user");
      return errorResponse(res, "Admin only", 403);
    }

    const { id } = req.params; // withdraw id

    if (!id) return errorResponse(res, "Withdraw id required", 400);

    const withdraw = await WithdrawModel.findById(id);

    if (!withdraw) return errorResponse(res, "Withdrawal request not found", 404);

    if (withdraw.status !== "pending") {
      console.log("❌ Withdrawal already processed:", withdraw.status);
      return errorResponse(res, "Request already processed", 400);
    }


    // 🔹 1. Check OxaPay balance before payout
    const balanceData = await checkOxaPayBalance();
    const usdtBalance = balanceData?.data?.USDT || 0;

    console.log("💸 Requested withdrawal amount:", withdraw.payableAmount);

    if (withdraw.payableAmount > usdtBalance) {
      console.log("❌ Insufficient OxaPay balance for this withdrawal.");
      return errorResponse(res, "Insufficient OxaPay balance", 400);
    }
    // Prepare OxaPay payload
    const payload = {
      amount: withdraw.payableAmount,
      currency: "USDT",
      address: withdraw.toAddress,
      // network: "BEP20",
      network: withdraw.coin === "USDT.TRC20" ? "TRC20" : "BEP20",
      // callback_url: "https://node.nftrealestate.us/api/v1/user/oxapay/payment/paymentstatus",
      callback_url: "https://node.nftrealestate.us/api/v1/user/oxapay/payment/withdraw-callback",
      reference_id: withdraw._id.toString(),
    };

    try {
      const headers = {
        "Content-Type": "application/json",
        "payout_api_key": payout_api_key,
      };

      console.log("🔹 OxaPay headers:", headers);

      const url = `https://api.oxapay.com/v1/payout`;
      console.log("🔹 Sending request to:", url);

      const oxaRes = await axios.post(url, payload, { headers, timeout: 30000 });

      console.log("✅ OxaPay raw response:", oxaRes.data);

      const responseData = oxaRes.data || {};
      // const trackId = responseData.data.track_id || responseData.data.track_id || responseData.transaction_id || null;
      const trackId =
        responseData?.data?.track_id ||
        responseData?.transaction_id ||
        null;
        
      const statusFromOxa = (responseData.data.status || "processing").toString().toLowerCase();

      console.log("🔹 Parsed trackId:", trackId, " | status:", statusFromOxa);

      // withdraw.status = statusFromOxa === "processing" || statusFromOxa === "confirmed" ? "pending" : "rejected";
      if (statusFromOxa === "confirmed") {
        withdraw.status = "approved";
      }
      else if (statusFromOxa === "failed" || statusFromOxa === "canceled") {
        withdraw.status = "rejected";
      }
      else {
        withdraw.status = "pending"; // processing
      }
      withdraw.trackId = trackId;
      withdraw.remarks = `Sent to OxaPay: ${JSON.stringify(responseData).slice(0, 500)}`;
      await withdraw.save();

      console.log("✅ Withdrawal updated in DB:", withdraw);

      return successResponse(res, "Withdrawal sent to OxaPay", { withdraw });
    } catch (oxaErr) {
      console.error("❌ OxaPay withdraw error:", oxaErr.response?.data || oxaErr.message);

      // On API failure - refund user
      const user = await UserModel.findById(withdraw.userId);
      if (user) {

        user.walletBalance = round2(user.walletBalance + withdraw.amount);
        await user.save();
      }

      withdraw.status = "invalid";
      withdraw.remarks = `OxaPay error: ${oxaErr.response?.data
          ? JSON.stringify(oxaErr.response.data).slice(0, 400)
          : oxaErr.message
        }`;
      await withdraw.save();

      console.log(" Withdrawal marked invalid and refunded");

      return errorResponse(res, "Failed to send withdrawal via OxaPay. Amount refunded to user.", 500);
    }
  } catch (err) {
    console.error(" adminApproveWithdrawal outer error:", err);
    return errorResponse(res, "Approve withdrawal failed", 500);
  }
};




/**
 * Admin: Reject or mark invalid
 * - Refunds deducted amount to user's walletBalance
 * - Marks withdraw status as rejected/invalid and writes remarks
 */
export const rejectWithdrawal = async (req, res) => {
  try {
    const adminUser = req.currentUser;
    if (!adminUser || adminUser.role !== "admin") {
      return errorResponse(res, "Admin only", 403);
    }

    const { id } = req.params;

    const withdraw = await WithdrawModel.findById(id);
    if (!withdraw) return errorResponse(res, "Withdrawal request not found", 404);
    if (withdraw.status !== "pending") return errorResponse(res, "Request already processed", 400);

    // Refund user
    // const user = await UserModel.findOne({ userId: withdraw.userId });
    const user = await UserModel.findById(withdraw.userId);
    if (!user) return errorResponse(res, "User not found for refund", 404);

    // Refund back to walletBalance
    user.walletBalance = round2(user.walletBalance + withdraw.amount);
    // user.totalInvested = round2(user.totalInvested + withdraw.amount); // optional: only if you want invested balance restored
    await user.save();

    // Mark withdrawal rejected
    withdraw.status = "rejected";
    await withdraw.save();

    return successResponse(res, "Withdrawal rejected and amount refunded to user", { withdraw });
  } catch (err) {
    console.error("adminRejectWithdrawal error:", err);
    return errorResponse(res, "Reject withdrawal failed", 500);
  }
};

/**
 * Get withdrawals (admin/user)
 * - Admin can pass query to see all; normal user sees only own
 */
export const listWithdrawals = async (req, res) => {
  try {
    const currentUser = req.currentUser;
    const { status, page = 1, limit = 20 } = req.query;
    const q = {};

    if (!currentUser) return errorResponse(res, "Unauthorized", 401);

    if (currentUser.role !== "admin") {
      q.userId = currentUser._id; // user apne withdraws hi dekh payega
    } else {
      if (status) q.status = status; // admin filter kar sakta hai
    }

    const withdrawals = await WithdrawModel.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return successResponse(res, "Withdrawals fetched", { withdrawals });
  } catch (err) {
    console.error("listWithdrawals error:", err);
    return errorResponse(res, "Failed to fetch withdrawals", 500);
  }
};



//--------------------------------------------------****************----------------------------------------------

// Transfer from walletBalance to own fundBalance (5% charge)
export const walletToFund = async (req, res) => {
  try {
    const { userId, amount } = req.body

    if (!userId || !amount) {
      return errorResponse(res, "All fields (userId, amount, txnpass) are required", 400)
    }

    const user = await UserModel.findOne({ userId }).select('+txnpass')
    if (!user || amount <= 0) return errorResponse(res, "Invalid request", 400)

    


    if (user.walletBalance < amount) return errorResponse(res, "Insufficient wallet balance", 400)

    const fee = amount * 0.05
    const received = amount - fee

    user.walletBalance -= amount
    user.fundBalance += received
    await user.save()

    // for Admin record only
    await AdminEarningModel.create({
      userId,
      amount: fee,
      source: 'walletToFund',
      note: `5% transfer fee to fundBalance on $${amount}`
    })

    await TransferHistoryModel.create({
      fromUserId: userId,
      toUserId: userId,
      from: "walletBalance",
      to: "fundBalance",
      amount,
      receivedAmount: received,
      fee
    })

    return successResponse(res, "Transfer to fund balance successful")
  } catch (err) {
    console.error("Wallet to fund error:", err)
    return errorResponse(res, "Failed to transfer", 500)
  }
}

// WalletBalance to another user's WalletBalance (0% fee)
export const walletToWallet = async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body

    const sender = await UserModel.findOne({ userId: fromUserId })
    const receiver = await UserModel.findOne({ userId: toUserId })

    if (!sender || !receiver || amount <= 0) return errorResponse(res, "Invalid request", 400)
    if (sender.walletBalance < amount) return errorResponse(res, "Insufficient balance", 400)

    sender.walletBalance -= amount
    receiver.walletBalance += amount

    await sender.save()
    await receiver.save()

    await TransferHistoryModel.create({
      fromUserId: fromUserId,
      toUserId: toUserId,
      from: "walletBalance",
      to: "walletBalance",
      amount,
      receivedAmount: amount,
      fee: 0
    })

    return successResponse(res, "Wallet to wallet transfer successful")
  } catch (err) {
    console.error("Wallet to wallet error:", err)
    return errorResponse(res, "Transfer failed", 500)
  }
}

// FundBalance to another user's FundBalance (0% fee)
export const fundToFund = async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body

  if (fromUserId === toUserId) {
      return errorResponse(res, "Self transfer is not allowed", 400);
    }

    const sender = await UserModel.findOne({ userId: fromUserId })
    const receiver = await UserModel.findOne({ userId: toUserId })

    if (!sender || !receiver || amount <= 0) return errorResponse(res, "Invalid request", 400)
    if (sender.fundBalance < amount) return errorResponse(res, "Insufficient fund balance", 400)

    const fee = amount * 0.05
    const received = amount - fee

    sender.fundBalance -= amount
    receiver.totalInvested += received
    receiver.isActivated = true;
    

    await sender.save()
    await receiver.save()


    // for Admin record only
    await AdminEarningModel.create({
      fromUserId,
      toUserId,
      amount: fee,
      source: 'walletToFund',
      note: `5% transfer fee to fundBalance on $${amount}`
    });

    await TransferHistoryModel.create({
      fromUserId: fromUserId,
      toUserId: toUserId,
      from: "fundBalance",
      to: "fundBalance",
      amount,
      receivedAmount: received,
      fee,
    })

    return successResponse(res, "Fund to fund transfer successful")
  } catch (err) {
    console.error("Fund to fund error:", err)
    return errorResponse(res, "Transfer failed", 500)
  }
}


// Withdrawal history to crypto wallet
export const getWithdrawHistory = async (req, res) => {
  try {

    const { type, userId } = req.query
    // 'pending', 'approved', 'rejected'
    // const userUniqueId = userId;
    let filter = {}
    if (type) {
      filter.status = type
    }
    if (userId) {
      filter.userUniqueId = userId
    }

    console.log(filter)
    const records = await WithdrawModel.find(filter)
      .populate({ path: 'userId', select: 'name withdrawTRC_ADDRESS withdrawBEP_ADDRESS' })
      .sort({ createdAt: -1 })
    const result = records.map(r => ({
      ...r.toObject(),
      userName: r.userId?.name || '',
      withdrawTRC_ADDRESS: r.userId?.withdrawTRC_ADDRESS || '',
      withdrawBEP_ADDRESS: r.userId?.withdrawBEP_ADDRESS || '',
    }))
    return successResponse(res, "Withdraw history fetched", result)
  } catch (err) {
    console.error("Withdraw history error:", err)
    return errorResponse(res, "Failed to fetch history", 500)
  }
}

// All transfer history: wallet-fund, fund-fund, wallet-wallet
export const getTransferHistory = async (req, res) => {
  try {
    const { userId } = req.params
    const records = await TransferHistoryModel.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }]
    }).sort({ createdAt: -1 })

    return successResponse(res, "Transfer history fetched", records)
  } catch (err) {
    console.error("Transfer history error:", err)
    return errorResponse(res, "Failed to fetch history", 500)
  }
}

//All user All transfer History
export const getAllTransferHistory = async (req, res) => {
  try {
    const records = await TransferHistoryModel.find().sort({ createdAt: -1 });

    return successResponse(res, "All transfer history fetched", records);
  } catch (err) {
    console.error("Transfer history error:", err);
    return errorResponse(res, "Failed to fetch history", 500);
  }
};


// wallet to fundBalance history
// Get walletBalance to fundBalance transfer history
export const getWalletToFundHistory = async (req, res) => {
  try {
    const { userId } = req.params
    const records = await TransferHistoryModel.find({
      fromUserId: userId,
      from: "walletBalance",
      to: "fundBalance"
    }).sort({ createdAt: -1 })

    return successResponse(res, "Wallet to Fund history fetched", records)
  } catch (err) {
    console.error("Wallet-Fund history error:", err)
    return errorResponse(res, "Failed to fetch wallet-fund history", 500)
  }
}


// fund to fund history
// Get fundBalance to fundBalance transfer history
export const getFundToFundHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const records = await TransferHistoryModel.find({
      fromUserId: userId,
      from: "fundBalance",
      to: "fundBalance"
    }).sort({ createdAt: -1 })


    const updatedRecords = await Promise.all(
      records.map(async (record) => {
        const fromUser = await UserModel.findOne({ userId: record.fromUserId });
        const toUser = await UserModel.findOne({ userId: record.toUserId });

        return {
          ...record.toObject(),
          fromUserName: fromUser?.name || "Unknown",
          toUserName: toUser?.name || "Unknown",
        };
      })
    );

    // const updatedRecords = {
    //   ...records,
    //   tousername
    // }


    return successResponse(res, "Fund to Fund history fetched", updatedRecords);
  } catch (err) {
    console.error("Fund-Fund history error:", err);
    return errorResponse(res, "Failed to fetch fund-fund history", 500);
  }
};
