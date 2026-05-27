export type GET_PROFILE_RESPONSE = {
  message: string;
  data: {
    user: UserProfileResponse;
  };
};

export type UPDATE_PROFILE_REQUEST = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
};

export type UPDATE_PROFILE_RESPONSE = {
  message: string;
  data: {
    user: UserProfileResponse;
  };
};

export type CREATE_APPLICATION_REQUEST = {
  name: string;
  email: string;
  address: string;
  admissionType?: string;
  tenthMarks?: number;
  twelfthMarks?: number;
  cetScore?: number;
  jeeScore?: number;
  diplomaCollege?: string;
  diplomaCgpa?: number;
  diplomaPercentage?: number;
  diplomaYearOfPassing?: number;
  transferType?: string;
  previousCollegeName?: string;
  previousCollegeAddress?: string;
  category: string;
  primaryCourse: string;
  secondaryCourse?: string;
  previousCategory?: string;
  category2?: string;
  primaryCourse2?: string;
  secondaryCourse2?: string;
  documents?: { type: string; url?: string; publicId?: string; uploadedAt?: Date }[];
};

export type CREATE_APPLICATION_RESPONSE = {
  message: string;
  data: {
    application: ApplicationResponse;
  };
};

export type GET_MY_APPLICATION_RESPONSE = {
  message: string;
  data: {
    application: ApplicationResponse | null;
  };
};

export type UPDATE_APPLICATION_REQUEST = {
  name?: string;
  email?: string;
  address?: string;
  admissionType?: string;
  tenthMarks?: number;
  twelfthMarks?: number;
  cetScore?: number;
  jeeScore?: number;
  diplomaCollege?: string;
  diplomaCgpa?: number;
  diplomaPercentage?: number;
  diplomaYearOfPassing?: number;
  transferType?: string;
  previousCollegeName?: string;
  previousCollegeAddress?: string;
  category?: string;
  primaryCourse?: string;
  secondaryCourse?: string;
  previousCategory?: string;
  category2?: string;
  primaryCourse2?: string;
  secondaryCourse2?: string;
  documents?: { type: string; url?: string; publicId?: string; uploadedAt?: Date }[];
  status?: string;
};

export type UPDATE_APPLICATION_RESPONSE = {
  message: string;
  data: {
    application: ApplicationResponse;
  };
};

export type GET_CATEGORIES_RESPONSE = {
  message: string;
  data: {
    categories: CategoryResponse[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type GET_COURSES_REQUEST = {
  categoryId: string;
};

export type GET_COURSES_RESPONSE = {
  message: string;
  data: {
    courses: CourseResponse[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
};

export type GET_ADMISSION_TYPES_RESPONSE = {
  message: string;
  data: {
    admissionTypes: AdmissionTypeResponse[];
  };
};

export type UserProfileResponse = {
  _id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationResponse = {
  _id: string;
  applicationId?: string;
  user: string;
  name: string;
  email: string;
  address: string;
  admissionType?: string;
  tenthMarks?: number;
  twelfthMarks?: number;
  cetScore?: number;
  jeeScore?: number;
  diplomaCollege?: string;
  diplomaCgpa?: number;
  diplomaPercentage?: number;
  diplomaYearOfPassing?: number;
  transferType?: string;
  previousCollegeName?: string;
  previousCollegeAddress?: string;
  category: CategoryResponse | string;
  primaryCourse: CourseResponse | string;
  secondaryCourse?: CourseResponse | string;
  previousCategory?: CategoryResponse | string;
  category2?: CategoryResponse | string;
  primaryCourse2?: CourseResponse | string;
  secondaryCourse2?: CourseResponse | string;
  allocatedCourse?: CourseResponse | string;
  documents: { type: string; url?: string; publicId?: string; uploadedAt?: string }[];
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  rejectedReason?: string;
  reviewNotes?: string;
  statusHistory?: { status: string; changedAt: string; changedBy?: string; reason?: string }[];
};

export type CategoryResponse = {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CourseResponse = {
  _id: string;
  name: string;
  code: string;
  category: string | CategoryResponse;
  parentCourse?: string | CourseResponse;
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

export type AdmissionTypeResponse = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  requiredDocuments: string[];
  optionalDocuments: string[];
  fee: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
