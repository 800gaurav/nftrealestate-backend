import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } from "../config/index.js";

const nodemailerOptions = {
  host: SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD
  }
};

const transporter = nodemailer.createTransport(nodemailerOptions);

export const sendEmail = async (options) => {
  try {
    const message = {
      from: `"NFT RealEstate" <${SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || ""
    };

    console.log("📧 Attempting to send email to:", options.email);
    console.log("📧 SMTP Config - Host:", SMTP_HOST, "User:", SMTP_USER);
    
    await transporter.sendMail(message);
    console.log("✅ Email sent successfully to:", options.email);
    return true;
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    console.error("❌ Full error:", err);
    throw new Error(`Failed to send email to ${options.email}: ${err.message}`);
  }
};

const sendRegisterationOTP = async (toMail, otp) => {
  const options = {
    email: toMail,
    subject: "Verify Your Email - Registration OTP",
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <tr>
          <td align="center" style="padding: 20px;">
            <div style="background-color: #ffffff; max-width: 600px; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin: 0 0 20px 0;">Email Verification</h2>
              <p style="font-size: 14px; color: #666; margin: 0 0 15px 0; line-height: 1.6;">Welcome to NFT RealEstate!</p>
              <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">Please use the OTP below to verify your email and complete your registration:</p>
              
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px; border: 2px solid #ddd;">
                <p style="margin: 0; font-size: 12px; color: #999;">Verification Code</p>
                <h1 style="margin: 10px 0 0 0; color: #2c3e50; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
              </div>
              
              <p style="font-size: 13px; color: #999; text-align: center; margin: 20px 0;">This code expires in 10 minutes.</p>
              <p style="font-size: 13px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">If you didn't create this account, please ignore this email.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">NFT RealEstate © ${new Date().getFullYear()}</p>
            </div>
          </td>
        </tr>
      </table>
    `,
    text: `Email Verification OTP\n\nYour OTP: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create this account, please ignore this email.\n\nNFT RealEstate`,
    otp: otp
  };

  try {
    await sendEmail(options);
    console.log(`OTP sent to ${toMail}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

const sendRegistrationOTP = async (toMail, otp) => {
  const options = {
    email: toMail,
    subject: "Your Password Reset OTP - NFT RealEstate",
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f9f9f9;">
        <tr>
          <td align="center" style="padding: 20px;">
            <div style="background-color: #ffffff; max-width: 600px; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin: 0 0 20px 0;">Password Reset Request</h2>
              <p style="font-size: 14px; color: #666; margin: 0 0 15px 0; line-height: 1.6;">Hello,</p>
              <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">We received a request to reset your password. Please use the OTP below to proceed:</p>
              
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px; border: 2px solid #ddd;">
                <p style="margin: 0; font-size: 12px; color: #999;">One-Time Password</p>
                <h1 style="margin: 10px 0 0 0; color: #2c3e50; font-size: 32px; letter-spacing: 5px; font-weight: bold;">${otp}</h1>
              </div>
              
              <p style="font-size: 13px; color: #999; text-align: center; margin: 20px 0;">This OTP expires in 10 minutes.</p>
              <p style="font-size: 13px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">If you didn't request this, please ignore this email or contact support immediately.</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">NFT RealEstate © ${new Date().getFullYear()}</p>
            </div>
          </td>
        </tr>
      </table>
    `,
    text: `Password Reset OTP\n\nYour OTP: ${otp}\n\nThis OTP expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nNFT RealEstate`,
    otp: otp
  };

  try {
    await sendEmail(options);
    console.log(`OTP sent to ${toMail}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

const sendRegistrationCredentialsEmail = async ({ toEmail, name, userId, password, referralCode }) => {
  const options = {
    email: toEmail,
    subject: "Welcome to NFT RealEstate! Your Registration Details",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://node.nftrealestate.us/uploads/jupiter.png" alt="Company Logo" style="height: 60px;" />
        </div>
        <h2 style="color: #333; text-align: center;">Welcome, ${name}!</h2>
        <p style="font-size: 16px; color: #555;">Thanks for registering with NFT RealEstate.</p>
        <p style="font-size: 16px; color: #555;">Here are your login details:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Referral Code:</strong> ${referralCode}</p>
        </div>
        <p style="font-size: 16px; color: #555;">Keep this information safe and do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">We're glad to have you onboard!</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The NFT RealEstate Team</p>
          <p>© ${new Date().getFullYear()} NFT RealEstate. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    await sendEmail(options);
    console.log(`Registration details sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending registration email:', error);
    throw new Error('Failed to send registration email');
  }
};

const sendbuynftEmailOtp = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport(nodemailerOptions);

    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: toEmail,
      subject: "NFT Purchase OTP",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://node.nftrealestate.us/uploads/jupiter.png" alt="Company Logo"  style="height: 60px;" />
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For NFT Purchase</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thanks for giving your valuable time to NFT RealEstate! To complete your NFT-BUY Process, please use the following OTP:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
          <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this OTP, please ignore this email or contact support.</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>The NFT RealEstate Team</p>
          <p>© ${new Date().getFullYear()} NFT RealEstate. All rights reserved.</p>
        </div>
      </div>
    `,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error };
  }
};

export { sendRegistrationOTP, sendbuynftEmailOtp, sendRegistrationCredentialsEmail, sendRegisterationOTP }