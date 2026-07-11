import { AppSettingModel } from "../../models/appSetting.model.js";

const normalizeWhatsappNumber = (value = "") => String(value).replace(/[^\d]/g, "");

export const getPublicSettings = async (req, res) => {
  try {
    const whatsapp = await AppSettingModel.findOne({ key: "whatsappNumber" });
    return res.status(200).json({
      success: true,
      data: {
        whatsappNumber: normalizeWhatsappNumber(whatsapp?.value || ""),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdminSettings = async (req, res) => {
  try {
    const whatsapp = await AppSettingModel.findOne({ key: "whatsappNumber" });
    return res.status(200).json({
      success: true,
      data: {
        whatsappNumber: normalizeWhatsappNumber(whatsapp?.value || ""),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const whatsappNumber = normalizeWhatsappNumber(req.body?.whatsappNumber || "");

    await AppSettingModel.findOneAndUpdate(
      { key: "whatsappNumber" },
      { $set: { value: whatsappNumber } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: { whatsappNumber },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
