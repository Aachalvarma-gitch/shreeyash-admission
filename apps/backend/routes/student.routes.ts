import { Router } from 'express';

import { protect, auth } from '../middlewares/auth.js';
import { uploadSingleWithErrorHandling } from '../middlewares/upload';
import {
  getProfile,
  updateProfile,
  createApplication,
  getMyApplication,
  updateApplication,
  getCategories,
  getCourses,
  getAdmissionTypes,
  getPreviousEfyCategory,
  uploadDocument,
  deleteDocument,
} from '../controllers/student.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Student
 *   description: Student endpoints
 */

router.get('/admission-types', getAdmissionTypes);
router.get('/categories', getCategories);
router.get('/courses/:categoryId', getCourses);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

router.get('/previous-efy-category', protect, auth('Student'), getPreviousEfyCategory);

router.post('/documents/upload', protect, auth('Student'), uploadSingleWithErrorHandling, uploadDocument);
router.delete('/documents/:documentType', protect, auth('Student'), deleteDocument);

router.post('/application', protect, auth('Student'), createApplication);
router.get('/application', protect, auth('Student'), getMyApplication);
router.put('/application', protect, auth('Student'), updateApplication);

export default router;
