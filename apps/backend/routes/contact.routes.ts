import { Router } from 'express';
import { protect, auth } from '../middlewares/auth.js';
import {
  createContactInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  getInquiryStats,
} from '../controllers/contact.controller.js';

const router = Router();

router.post('/inquiries', createContactInquiry);

router.use(protect);
router.use(auth('Admin', 'Super Admin'));

router.get('/inquiries', getAllInquiries);
router.get('/inquiries/stats', getInquiryStats);
router.get('/inquiries/:id', getInquiryById);
router.put('/inquiries/:id', updateInquiry);
router.delete('/inquiries/:id', deleteInquiry);

export default router;