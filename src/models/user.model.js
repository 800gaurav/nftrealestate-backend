import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { BCRYPTSALT } from "../config/index.js";
import { type } from "os";

// Define referral code options
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_MAX_RETRIES = 3;

const nftPurchaseSchema = new mongoose.Schema({
  nft: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', required: true },
  price: { type: Number, required: true },
  profitEarned: { type: Number, default: 0 },
  purchasedAt: { type: Date, default: Date.now },
  planType: {type:String, enum: ["ROI", "INCREASED_ROI" ], default: "ROI"},
boostRate: {type: Number, default: null},
refunded: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema(
  {
    userId: {type:String},
    name: { type: String },
    email: { type: String,},
    password: { type: String }, 
    phone: { type: Number },
    txnpass: {type: String,}, 
    role: { type: String, enum: ["user", "admin"], default: "user"},

    referralCode: { type: String, unique: true, uppercase: true, trim: true },
    sponsor: {
      type: String
    },
    referrer: { type: mongoose.Types.ObjectId, ref: 'User'},
    placementId: { type: String },
    placementParent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    placementSide: { type: String, enum: ["left", "right"], default: null },
    binaryLevel: { type: Number, default: 0 },
    referralLevel: { type: Number, default: 0 },
    
    leftChild: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rightChild: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    directreferaralCount:{type:Number, default: 0},
    leftBusiness: { type: Number, default: 0 },
    rightBusiness: { type: Number, default: 0 },
    leftCarry: { type: Number, default: 0 },
    rightCarry: { type: Number, default: 0 },
    isBinaryStarted: { type: Boolean, default: false },
    todaypair: { type: Number, default: 0 },
    matchingIncome: { type: Number, default: 0 },
    todayMatchingIncome: { type: Number, default: 0 },
    matchingIncomeHistory: [
      {
        amount: { type: Number, default: 0 },
        matchedBusiness: { type: Number, default: 0 },
        leftCarryBefore: { type: Number, default: 0 },
        rightCarryBefore: { type: Number, default: 0 },
        leftCarryAfter: { type: Number, default: 0 },
        rightCarryAfter: { type: Number, default: 0 },
        percent: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
      }
    ],
    
    // activation & plan

    isActivated: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    
    // wallets & earnings
    referralBonus: {type: Boolean, default: false},
    withdrawUnlock: {type: Boolean, default: false},
    totalInvested: { type: Number, default: 0, min: 0 },
    stakingPrincipal: { type: Number, default: 0, min: 0 },
    roiPercent: { type: Number, default: 0.5, min: 0 },
    referralGiven: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0, min: 0 },
    fundBalance: { type: Number, default: 0, min: 0 },
   fundWalletHistory: [
     {
       type: { type: String, enum: ["credit", "debit"], required: true },
       amount: { type: Number, required: true },
       note: { type: String, default: "" },
       balanceAfter: { type: Number },
       date: { type: Date, default: Date.now },
     }
   ],
    todayIncome: {type: Number, default: 0},
    roiIncome: {type: Number, default: 0},
    totalProfitEarned: { type: Number, default: 0 },
    emailOTP: { type: Number, select: false },
    nftbuyOTP: {type: Number},
    totalDomesticIncome : { type: Number, default: 0 },
    royalyIncome: {type: Number, default: 0},
   domesticUnlockedLevel: { type: Number, default: 1 },
   proBonusIncome: {type: Number, default: 0},
   teamBusinessIncome: { type: Number, default: 0 },
   teamBusinessHistory: [
     {
       fromUser: { type: String },
       referredBy: { type: String },
       baseAmount: { type: Number, default: 0 },
       amount: { type: Number, default: 0 },
       date: { type: Date, default: Date.now },
     }
   ],
   stopROIIncome: { type: Boolean, default: false },

   //Withdraw
   withdrawTRC_ADDRESS: { type: String, default: "" },
   withdrawBEP_ADDRESS: { type: String, default: "" },

   
  proBonusHistory: [
      {
        fromUser: { type: String, ref: 'User' },
        baseAmount: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
      }
    ],
    roiIncomeHistory: [
      {
        amount: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
      }
    ],
downline: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
   domesticIncomeDetails: [
  {
    level: Number,
    income: Number,
    username: String,
    fromUser: String,
    date: Date
  }
],

// inside your userSchema definition add these fields
rankRewardIncome: { type: Number, default: 0 }, // total amount earned from rank rewards
rankRewardHistory: [
  {
    milestone: Number,      // e.g. 10000
    reward: Number,         // e.g. 50
    business: Number,       // eligible business used to compute reward
    strongLeg: Number,      // capped strong leg (40% part)
    secondLeg: Number,      // capped 2nd leg (30%)
    thirdLeg: Number,       // capped 3rd leg (30%)
    legs: [
      {
        userId: { type: String },
        business: Number
      }
    ],
    date: { type: Date, default: Date.now }
  }
],
claimedRankRewards: [{ type: Number }], // list of thresholds already claimed, e.g. [10000,25000]

currentRank: { type: String, default: null },
teamBusiness: { type: Number, default: 0 },

royaltyHistory: [ 
  {
    business: Number,
    strongLeg: Number,
    otherLeg: Number,
    reward: Number,
    date: Date
  }
],
     nfts: [nftPurchaseSchema],
  },
  {
    timestamps: true
  }
);

userSchema.statics.generateReferralCode = async function () {
  let referralCode;
  let attempts = 0;
  let isUnique = false;

  while (!isUnique && attempts < REFERRAL_CODE_MAX_RETRIES) {
    // Generate a random number and convert to string
    referralCode = crypto.randomBytes(Math.ceil(REFERRAL_CODE_LENGTH / 2))
      .toString('hex')
      .slice(0, REFERRAL_CODE_LENGTH)
      .toUpperCase();

    // Check if code exists in database
    const existingUser = await this.findOne({ referralCode });
    if (!existingUser) isUnique = true;

    attempts++;
  }

  if (!isUnique) throw new Error('Failed to generate a unique referral code after maximum attempts');
  return referralCode;
};

// Middleware for password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, Number(BCRYPTSALT));
    this.updatedAt = Date.now();
    return next();
  } catch (err) {
    return next(err);
  }
});

// Middleware to generate referral code for new users
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.referralCode) {
    try {
      this.referralCode = await this.constructor.generateReferralCode();
      return next();
    } catch (err) {
      return next(err);
    }
  }
  return next();
});

// generate userID for user
userSchema.pre('save', async function (next) {
  if (!this.isNew) return next(); // Only for new user

  let isUnique = false
  let generatedUserId

  const namePrefix = (this.name || "XXX").substring(0, 3).toUpperCase().padEnd(3, "X")

  while (!isUnique) {
    const randomPart = Math.floor(Math.random() * 100000).toString().padStart(5, '0')

    generatedUserId = `${namePrefix}${randomPart}`

    const existingUser = await mongoose
      .model('User')
      .findOne({ userId: generatedUserId })

    if (!existingUser) isUnique = true
  }

  this.userId = generatedUserId
  next()
})


// generate transaction password
userSchema.pre('save', async function (next) {
  if (!this.isNew) return next(); // Only run for new document

  let isUnique = false;
  let transactionPassword ;

  while (!isUnique) {
    transactionPassword  = Math.floor(100000 + Math.random() * 900000).toString();
    const existingUser = await mongoose
      .model('User')
      .findOne({ txnpass: transactionPassword  });
    if (!existingUser) isUnique = true;
  }
  this.txnpass = transactionPassword ;
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

//Method to reset/change password token
userSchema.methods.createPasswordRestToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');
  this.passwordRestExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
  };

  //Method to change transaction password
userSchema.methods.createTxnPasswordRestToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.txnPasswordResetToken = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');
  this.txnPasswordRestExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

//Forgot Password Method

const UserModel = mongoose.model("User", userSchema);

export { UserModel }
