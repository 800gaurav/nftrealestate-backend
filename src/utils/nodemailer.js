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

    await transporter.sendMail(message);
    console.log("✅ Email sent to:", options.email);
    return true;
  } catch (err) {
    console.error("❌ Email send error:", err);
    return false;
  }
};

const sendRegisterationOTP = async (toMail, otp) => {
  // console.log(url)
  // return 
  const options = {
    email: toMail,
    subject: "Your One-Time Password (OTP) for Registration",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://backend.jupitertoken.us/uploads/jupiter.png" alt="Company Logo" style="height: 100px;" />
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For Registration</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thanks for giving your valuable time to NFT RealEstate! To complete your Registration, please use the following OTP:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 6px;">
          <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this OTP, please ignore this email or contact support.</p>
        <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #999;">
          <p>Best regards,<br>NFT RealEstate</p>
          <p>© ${new Date().getFullYear()} NFT RealEstate. All rights reserved.</p>
        </div>
      </div>
    `,
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
  // const url = `data:image/png;base64,${logobase64}`
  // console.log(url)
  // return 
  const options = {
    email: toMail,
    subject: "Your One-Time Password (OTP) for Forget Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://backend.jupitertoken.us/uploads/jupiter.png" alt="Company Logo" style="height: 60px;" />
        </div>
        <h2 style="color: #333; text-align: center;">Verify Your OTP For Password Reset</h2>
        <p style="font-size: 16px; color: #555;">Dear User,</p>
        <p style="font-size: 16px; color: #555;">Thanks for giving your valuable time to NFT RealEstate! To complete your reset password, please use the following OTP:</p>
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
          <img src="https://backend.jupitertoken.us/uploads/jupiter.png" alt="Company Logo" style="height: 60px;" />
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
          <img src="https://backend.jupitertoken.us/uploads/jupiter.png" alt="Company Logo"  style="height: 60px;" />
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