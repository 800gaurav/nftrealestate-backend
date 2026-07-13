import mongoose from 'mongoose'

const withdrawSchema = new mongoose.Schema({
  // userId: {
  //   type: String,
  //   required: true
  // },
userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
userUniqueId: { type: String },

  trackId:{
type: String,
  },
  amount: {
    type: Number,
    required: true
  },
  coin: {
    type: String,
    enum: ['USDT.TRC20', 'USDT.BEP20'],
    required: true
  },
  type: {
    type: String,
  },
  toAddress: {
    type: String,
    // required: true
  },
  serviceCharge: {
    type: Number,
    required: true
  },
  payableAmount: {
    type: Number,
    required: true
  },
  stakingDeducted: { type: Number, default: 0 },
  walletDeducted: {
    type: Number,
    default: 0
  },
  fundDeducted: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['oxapay', 'manual'],
  },
  txnId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'invalid'],
    default: 'pending'
  },
  otp: {
    type: String
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  remarks: {
  type: String,
  default: ''
}
}, { timestamps: true })

export const WithdrawModel = mongoose.model('Withdraw', withdrawSchema)
