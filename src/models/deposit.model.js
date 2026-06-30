import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  confirmedAmount: {
    type: Number,
    default: 0
  },
  purpose: {
    type: String,
    enum: ["deposit", "package"],
    default: "deposit"
  },
  packageCode: {
    type: String
  },
  packageTitle: {
    type: String
  },
  packageAmount: {
    type: Number,
    default: 0
  },
  stakingAmount: {
    type: Number,
    default: 0
  },
  planDailyPercent: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: "USDT"
  },
  coin: {
    type: String,
    enum: ["TRC20", "BEP20"],
    // required: true 
  },
  address: {
    type: String,
    // required: true
  },
  orderId: {
    type: String,
    unique: true,

  },
  status: {
    type: String,
    enum: ["pending", "paying", "success", "failed"],
    default: "pending"
  },
  date: {
    type: Date,
    default: Date.now
  },
  txHash: {
    type: String,

  },
  network: {
    type: String,

  }
});

export const DepositModel = mongoose.model("Deposit", depositSchema);
