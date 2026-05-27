import { Router } from 'express';

import { protect, auth } from '../middlewares/auth.js';
import {
  getPublicCategories,
  getPublicCourses,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/course.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Course
 *   description: Course and Category management endpoints
 */

// Public routes
router.get('/public/categories', getPublicCategories);
router.get('/public/courses/:categoryId', getPublicCourses);

// Protected routes
router.use(protect);
router.use(auth('Admin', 'Super Admin'));

// Category CRUD
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Course CRUD
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

export default router;