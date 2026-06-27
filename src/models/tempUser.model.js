// models/TempUser.js
import mongoose from "mongoose";

const TempUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  referrerCode: String,
  side: { type: String, enum: ["left", "right"], default: "left" },
  otp: String,
  otpExpiry: Date,
}, { timestamps: true });

export const TempUserModel = mongoose.model("TempUser", TempUserSchema);
