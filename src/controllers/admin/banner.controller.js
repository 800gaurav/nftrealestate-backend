import { BannerModel } from "../../models/banner.model.js"

// Admin can update banner message and status
export const updateBanner = async (req, res) => {
  try {
    const { message, imageUrl, isActive } = req.body
    const uploadedImageUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/nft/${req.file.filename}`
      : imageUrl || ""

    const banner = await BannerModel.findOne().sort({ createdAt: -1 })
    if (banner) {
      banner.message = message
      banner.imageUrl = uploadedImageUrl
      banner.isActive = Boolean(isActive)
      await banner.save()
    } else {
      await BannerModel.create({ message, imageUrl: uploadedImageUrl, isActive: Boolean(isActive) })
    }

    res.status(200).json({ success: true, message: "Banner updated successfully" })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Anyone can fetch current banner
export const getBanner = async (req, res) => {
  try {
    const banner = await BannerModel.findOne().sort({ createdAt: -1 })
    if (!banner) {
      return res.status(200).json({ show: false, isActive: false, message: "", imageUrl: "" })
    }

    res.status(200).json({
      show: Boolean(banner.isActive),
      isActive: Boolean(banner.isActive),
      message: banner.message || "",
      imageUrl: banner.imageUrl || "",
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
};