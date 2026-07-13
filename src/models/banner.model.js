import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true })

export const BannerModel = mongoose.model('Banner', bannerSchema);
