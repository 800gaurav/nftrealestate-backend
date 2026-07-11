// models/TempUser.js
import mongoose from "mongoose";

const TempUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String },
  phone: String,
  password: String,
  referrerCode: String,
  side: { type: String, enum: ["left", "right"], default: "left" },
  placementParentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  otp: String,
  otpExpiry: Date,
  isVerifying: { type: Boolean, default: false },
}, { timestamps: true });

export const TempUserModel = mongoose.model("TempUser", TempUserSchema);
