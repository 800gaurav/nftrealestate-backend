import express from 'express';
import  upload from '../../utils/multer.js';
import { errorResponse, successResponse } from '../../utils/api-response.js';
import { requireAuth } from '../../middlewares/require-auth.js';
import { NftModel } from '../../models/nftstock.model.js';
import { SERVICE_PLANS } from '../../config/plans.js';

const router = express.Router();

router.post(
  '/upload',
  requireAuth(['admin']),
  upload.single('image'),
  async (req, res) => {
    try {
      const { title, description, price } = req.body;
      const imagePath = req.file?.path.replace(/\\/g, '/');
      const numericPrice = Number(price);

      if (!title || !numericPrice || !imagePath) {
        return errorResponse(res, 'Title, price, and image are required.', 400);
      }

      if (!SERVICE_PLANS.some(plan => plan.price === numericPrice)) {
        return errorResponse(res, 'Only $12, $25, $50, and $100 service packages are allowed.', 400);
      }

      const nft = await NftModel.create({
        title,
        description,
        price: numericPrice,
        image: imagePath,
      });

      successResponse(res, 'NFT uploaded successfully', nft, 201);
    } catch (error) {
      console.error(error.message);
      errorResponse(res, 'NFT upload failed', 500, error.message);
    }
  }
);

//delete a NFT
router.delete(
  '/delete/:id',
  requireAuth(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const nft = await NftModel.findById(id);
      if (!nft) {
        return errorResponse(res, 'NFT not found', 404);
      }

      await NftModel.findByIdAndDelete(id);

      successResponse(res, 'NFT deleted successfully', null, 200);
    } catch (error) {
      console.error(error.message);
      errorResponse(res, 'NFT deletion failed', 500, error.message);
    }
  }
);


// Get all NFTs (for admin or user)
router.get(
  '/',
  requireAuth(['admin', 'user']),
 async (req, res) => {
    try {
      const allowedPrices = SERVICE_PLANS.map(plan => plan.price);
      const uniquePriceNfts = await NftModel.aggregate([
        {
          $match: { price: { $in: allowedPrices } }
        },
        {
          $sort: { createdAt: -1 } 
        },
        {
          $group: {
            _id: '$price',
            doc: { $first: '$$ROOT' } 
          }
        },
        {
          $replaceRoot: { newRoot: '$doc' }
        }
      ]);

      const formattedNfts = uniquePriceNfts.map(nft => ({
        _id: nft._id,
        title: nft.title,
        description: nft.description,
        price: nft.price,
        isActive: nft.isActive,
        image: nft.image ? `${req.protocol}://${req.get('host')}/${nft.image}` : null,
        createdAt: nft.createdAt,
        updatedAt: nft.updatedAt
      }));

      successResponse(res, 'Unique price NFTs fetched successfully', formattedNfts);
    } catch (error) {
      console.error(error.message);
      errorResponse(res, 'Failed to fetch unique price NFTs', 500, error.message);
    }
  }
);

router.get('/service-plans', requireAuth(['admin', 'user']), (req, res) => {
  successResponse(res, 'Service plans fetched successfully', SERVICE_PLANS);
});

router.get('/show-nft-price-wise',
  requireAuth(['admin', 'user']),
  async(req, res) => {
    try {
      const {price} = req.query;
      const query = {};
       if (price) {
        query.price = Number(price); 
        
      }
const nfts = await NftModel.find(query);

      const formattedNfts = nfts.map(nft => ({
        _id: nft._id,
        title: nft.title,
        description: nft.description,
        price: nft.price,
        isActive: nft.isActive,
        image: nft.image ? `${req.protocol}://${req.get('host')}/${nft.image}` : null,
        createdAt: nft.createdAt,
        updatedAt: nft.updatedAt
      }));

      successResponse(res, 'NFTs fetched successfully', formattedNfts);

    } catch (error) {
           console.error(error.message);
      errorResponse(res, 'Failed to fetch NFTs', 500, error.message);
    }
  }
)

export { router as nftRoutes };
