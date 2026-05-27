export type GET_PUBLIC_CATEGORIES_RESPONSE = {
  message: string;
  data: {
    categories: CourseCategoryResponse[];
  };
};

export type GET_PUBLIC_COURSES_REQUEST = {
  categoryId: string;
};

export type GET_PUBLIC_COURSES_RESPONSE = {
  message: string;
  data: {
    courses: CourseDataResponse[];
  };
};

export type GET_CATEGORIES_RESPONSE = {
  message: string;
  data: {
    categories: CourseCategoryResponse[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type CREATE_CATEGORY_REQUEST = {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
};

export type CREATE_CATEGORY_RESPONSE = {
  message: string;
  data: {
    category: CourseCategoryResponse;
  };
};

export type UPDATE_CATEGORY_REQUEST = {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export type UPDATE_CATEGORY_RESPONSE = {
  message: string;
  data: {
    category: CourseCategoryResponse;
  };
};

export type DELETE_CATEGORY_RESPONSE = {
  message: string;
  data: null;
};

export type GET_COURSES_REQUEST = {
  category?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

export type GET_COURSES_RESPONSE = {
  message: string;
  data: {
    courses: CourseDataResponse[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type CREATE_COURSE_REQUEST = {
  name: string;
  code: string;
  category: string;
  description?: string;
  duration: number;
  eligibility?: string;
  fees?: number;
  seats?: number;
  displayOrder?: number;
};

export type CREATE_COURSE_RESPONSE = {
  message: string;
  data: {
    course: CourseDataResponse;
  };
};

export type UPDATE_COURSE_REQUEST = {
  name: string;
  code: string;
  category: string;
  description?: string;
  duration: number;
  eligibility?: string;
  fees?: number;
  seats?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UPDATE_COURSE_RESPONSE = {
  message: string;
  data: {
    course: CourseDataResponse;
  };
};

export type DELETE_COURSE_RESPONSE = {
  message: string;
  data: null;
};

export type CourseCategoryResponse = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CourseDataResponse = {
  _id: string;
  name: string;
  code: string;
  category: string | CourseCategoryResponse;
  description?: string;
  duration: number;
  eligibility?: string;
  fees: number;
  seats: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};