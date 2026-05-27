import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './models/Role.model.js';
import User from './models/User.model.js';
import Category from './models/Category.model.js';
import Course from './models/Course.model.js';
import AdmissionType from './models/AdmissionType.model.js';
import Application from './models/Application.model.js';
import ContactInquiry from './models/ContactInquiry.model.js';
import { ADMISSION_TYPE_DOMAINS } from './config/admissionTypeCategories.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shreeyas-db';

const ADMISSION_PREFIX: Record<string, string> = {
  POLYTECHNIC: 'POL',
  ENGINEERING_FIRST_YEAR: 'ENG',
  DIRECT_SECOND_YEAR: 'DSE',
  DIRECT_SECOND_YEAR_DIPLOMA: 'DSE',
  DIRECT_SECOND_YEAR_FE: 'DSF',
  COLLEGE_TRANSFER: 'CTR',
  BRANCH_CHANGE: 'BCH',
};

type AdmissionTypeValue =
  | 'POLYTECHNIC'
  | 'ENGINEERING_FIRST_YEAR'
  | 'DIRECT_SECOND_YEAR'
  | 'DIRECT_SECOND_YEAR_DIPLOMA'
  | 'DIRECT_SECOND_YEAR_FE'
  | 'COLLEGE_TRANSFER'
  | 'BRANCH_CHANGE';

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVISION_REQUESTED'
  | 'MERIT_LIST'
  | 'SEAT_ALLOCATED'
  | 'FEE_PAID'
  | 'ADMISSION_CONFIRMED';

interface StudentSeed {
  firstName: string;
  lastName: string;
  admissionType: AdmissionTypeValue;
  emailSuffix: string;
  status: ApplicationStatus;
  hasSecondary: boolean;
}

// ──────────────────────────────────────────────────
// ROLES
// ──────────────────────────────────────────────────
const roles = [
  { name: 'Student', description: 'Student applicant', permissions: [] },
  { name: 'Admin', description: 'Admin staff member', permissions: [] },
  { name: 'Super Admin', description: 'Super administrator', permissions: [] },
];

const adminUsers = [
  { email: 'admin@sycet.org', mobile: '9876543210', password: 'Admin@123', firstName: 'System', lastName: 'Admin', roleName: 'Admin' },
  { email: 'superadmin@sycet.org', mobile: '9876543211', password: 'SuperAdmin@123', firstName: 'Super', lastName: 'Admin', roleName: 'Super Admin' },
];

// ──────────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────────
const categories = [
  { name: 'Computer Science', slug: 'computer-science', domain: 'computing', description: 'Computer Science programs', displayOrder: 1 },
  { name: 'Information Technology', slug: 'information-technology', domain: 'computing', description: 'Information Technology programs', displayOrder: 2 },
  { name: 'AI / ML', slug: 'ai-ml', domain: 'computing', description: 'Artificial Intelligence & Machine Learning', displayOrder: 3 },
  { name: 'Mechanical Engineering', slug: 'mechanical-engineering', domain: 'mechanical', description: 'Mechanical Engineering programs', displayOrder: 4 },
  { name: 'Civil Engineering', slug: 'civil-engineering', domain: 'civil', description: 'Civil Engineering programs', displayOrder: 5 },
  { name: 'Electrical Engineering', slug: 'electrical-engineering', domain: 'electrical', description: 'Electrical Engineering programs', displayOrder: 6 },
  { name: 'Electronics Engineering', slug: 'electronics-engineering', domain: 'electronics', description: 'Electronics Engineering programs', displayOrder: 7 },
  { name: 'Commerce', slug: 'commerce', domain: 'commerce', description: 'Commerce & Business programs', displayOrder: 8 },
  { name: 'Arts', slug: 'arts', domain: 'arts', description: 'Arts & Humanities programs', displayOrder: 9 },
  { name: 'Data Science', slug: 'data-science', domain: 'computing', description: 'Data Science & Analytics programs', displayOrder: 10 },
  { name: 'Cyber Security', slug: 'cyber-security', domain: 'computing', description: 'Cyber Security programs', displayOrder: 11 },
  { name: 'Pharmacy', slug: 'pharmacy', domain: 'pharmacy', description: 'Pharmacy programs', displayOrder: 12 },
  { name: 'Management Studies', slug: 'management-studies', domain: 'management', description: 'Management & Business Administration programs', displayOrder: 13 },
  { name: 'Science', slug: 'science', domain: 'science', description: 'General Science programs', displayOrder: 14 },
];

// ──────────────────────────────────────────────────
// COURSES
// ──────────────────────────────────────────────────
const courseDefs = [
  { name: 'BCA', code: 'CS-BCA', categorySlug: 'computer-science', duration: 3, fees: 85000, seats: 120 },
  { name: 'MCA', code: 'CS-MCA', categorySlug: 'computer-science', duration: 2, fees: 120000, seats: 60 },
  { name: 'BCS', code: 'CS-BCS', categorySlug: 'computer-science', duration: 3, fees: 75000, seats: 90 },
  { name: 'MSc Computer Science', code: 'CS-MSC', categorySlug: 'computer-science', duration: 2, fees: 110000, seats: 45 },

  { name: 'BSc IT', code: 'IT-BSC', categorySlug: 'information-technology', duration: 3, fees: 80000, seats: 90 },
  { name: 'MSc IT', code: 'IT-MSC', categorySlug: 'information-technology', duration: 2, fees: 105000, seats: 45 },

  { name: 'BSc AI/ML', code: 'AI-BSC', categorySlug: 'ai-ml', duration: 3, fees: 95000, seats: 60 },
  { name: 'MSc AI/ML', code: 'AI-MSC', categorySlug: 'ai-ml', duration: 2, fees: 130000, seats: 30 },

  { name: 'Diploma Mechanical', code: 'ME-DIP', categorySlug: 'mechanical-engineering', duration: 3, fees: 45000, seats: 120 },
  { name: 'BE Mechanical', code: 'ME-BE', categorySlug: 'mechanical-engineering', duration: 4, fees: 95000, seats: 60 },
  { name: 'ME Mechanical', code: 'ME-ME', categorySlug: 'mechanical-engineering', duration: 2, fees: 110000, seats: 30 },

  { name: 'Diploma Civil', code: 'CV-DIP', categorySlug: 'civil-engineering', duration: 3, fees: 40000, seats: 120 },
  { name: 'BE Civil', code: 'CV-BE', categorySlug: 'civil-engineering', duration: 4, fees: 85000, seats: 60 },
  { name: 'ME Civil', code: 'CV-ME', categorySlug: 'civil-engineering', duration: 2, fees: 100000, seats: 30 },

  { name: 'Diploma Electrical', code: 'EE-DIP', categorySlug: 'electrical-engineering', duration: 3, fees: 42000, seats: 90 },
  { name: 'BE Electrical', code: 'EE-BE', categorySlug: 'electrical-engineering', duration: 4, fees: 90000, seats: 60 },
  { name: 'ME Electrical', code: 'EE-ME', categorySlug: 'electrical-engineering', duration: 2, fees: 105000, seats: 30 },

  { name: 'Diploma Electronics', code: 'EC-DIP', categorySlug: 'electronics-engineering', duration: 3, fees: 42000, seats: 90 },
  { name: 'BE Electronics', code: 'EC-BE', categorySlug: 'electronics-engineering', duration: 4, fees: 90000, seats: 60 },
  { name: 'ME Electronics', code: 'EC-ME', categorySlug: 'electronics-engineering', duration: 2, fees: 105000, seats: 30 },

  { name: 'BCom', code: 'CM-BCOM', categorySlug: 'commerce', duration: 3, fees: 35000, seats: 120 },
  { name: 'MCom', code: 'CM-MCOM', categorySlug: 'commerce', duration: 2, fees: 55000, seats: 60 },
  { name: 'BBA', code: 'CM-BBA', categorySlug: 'commerce', duration: 3, fees: 65000, seats: 90 },
  { name: 'MBA', code: 'CM-MBA', categorySlug: 'commerce', duration: 2, fees: 150000, seats: 45 },

  { name: 'BA', code: 'AR-BA', categorySlug: 'arts', duration: 3, fees: 25000, seats: 150 },
  { name: 'MA', code: 'AR-MA', categorySlug: 'arts', duration: 2, fees: 40000, seats: 60 },
  { name: 'BSc', code: 'AR-BSC', categorySlug: 'arts', duration: 3, fees: 30000, seats: 90 },
  { name: 'MSW', code: 'AR-MSW', categorySlug: 'arts', duration: 2, fees: 45000, seats: 45 },

  { name: 'BSc Data Science', code: 'DS-BSC', categorySlug: 'data-science', duration: 3, fees: 95000, seats: 60 },
  { name: 'MSc Data Science', code: 'DS-MSC', categorySlug: 'data-science', duration: 2, fees: 130000, seats: 30 },
  { name: 'PG Diploma Data Science', code: 'DS-PGD', categorySlug: 'data-science', duration: 1, fees: 75000, seats: 40 },

  { name: 'BSc Cyber Security', code: 'CY-BSC', categorySlug: 'cyber-security', duration: 3, fees: 90000, seats: 60 },
  { name: 'MSc Cyber Security', code: 'CY-MSC', categorySlug: 'cyber-security', duration: 2, fees: 125000, seats: 30 },
  { name: 'PG Diploma Cyber Security', code: 'CY-PGD', categorySlug: 'cyber-security', duration: 1, fees: 70000, seats: 40 },

  { name: 'Diploma Pharmacy', code: 'PH-DIP', categorySlug: 'pharmacy', duration: 2, fees: 50000, seats: 60 },
  { name: 'BPharm', code: 'PH-BPH', categorySlug: 'pharmacy', duration: 4, fees: 110000, seats: 100 },
  { name: 'MPharm', code: 'PH-MPH', categorySlug: 'pharmacy', duration: 2, fees: 150000, seats: 45 },
  { name: 'PharmD', code: 'PH-DOC', categorySlug: 'pharmacy', duration: 6, fees: 200000, seats: 30 },

  { name: 'BBA', code: 'MG-BBA', categorySlug: 'management-studies', duration: 3, fees: 75000, seats: 90 },
  { name: 'MBA', code: 'MG-MBA', categorySlug: 'management-studies', duration: 2, fees: 180000, seats: 60 },
  { name: 'BMS', code: 'MG-BMS', categorySlug: 'management-studies', duration: 3, fees: 70000, seats: 60 },
  { name: 'PGDM', code: 'MG-PGD', categorySlug: 'management-studies', duration: 2, fees: 160000, seats: 45 },

  { name: 'BSc General', code: 'SC-BSC', categorySlug: 'science', duration: 3, fees: 35000, seats: 120 },
  { name: 'MSc General', code: 'SC-MSC', categorySlug: 'science', duration: 2, fees: 55000, seats: 60 },
  { name: 'BSc Biotechnology', code: 'SC-BBT', categorySlug: 'science', duration: 3, fees: 65000, seats: 60 },
  { name: 'MSc Biotechnology', code: 'SC-MBT', categorySlug: 'science', duration: 2, fees: 95000, seats: 30 },
];

// ──────────────────────────────────────────────────
// ADMISSION TYPES
// ──────────────────────────────────────────────────
const admissionTypes = [
  {
    name: 'Polytechnic',
    slug: 'polytechnic',
    description: 'Admission to Polytechnic diploma programs after 10th',
    requiredDocuments: ['tenth_marksheet', 'leaving_certificate', 'photo', 'aadhaar_card'],
    optionalDocuments: [],
    fee: 500,
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Engineering First Year',
    slug: 'engineering_first_year',
    description: 'Admission to First Year Engineering after 12th (HSC) with CET/JEE scores',
    requiredDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'leaving_certificate', 'photo', 'aadhaar_card'],
    optionalDocuments: ['jee_result'],
    fee: 1000,
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Direct Second Year',
    slug: 'direct_second_year',
    description: 'Direct admission to Second Year Engineering after diploma (general)',
    requiredDocuments: ['diploma_marksheet', 'diploma_certificate', 'migration_certificate', 'tenth_marksheet', 'photo', 'aadhaar_card', 'leaving_certificate'],
    optionalDocuments: [],
    fee: 0,
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Direct Second Year (After Diploma)',
    slug: 'direct_second_year_diploma',
    description: 'Direct admission to Second Year Engineering after completing Diploma/Polytechnic',
    requiredDocuments: ['diploma_marksheet', 'diploma_certificate', 'migration_certificate', 'tenth_marksheet', 'photo', 'aadhaar_card', 'leaving_certificate'],
    optionalDocuments: [],
    fee: 0,
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'Direct Second Year (After First Year)',
    slug: 'direct_second_year_fe',
    description: 'Direct admission to Second Year Engineering after completing First Year Engineering',
    requiredDocuments: ['first_year_marksheet', 'previous_college_bonafide', 'leaving_certificate', 'tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'photo', 'aadhaar_card'],
    optionalDocuments: [],
    fee: 0,
    displayOrder: 5,
    isActive: true,
  },
  {
    name: 'College Transfer',
    slug: 'college_transfer',
    description: 'Transfer from another college/institution to continue same program',
    requiredDocuments: ['previous_college_bonafide', 'previous_year_marksheet', 'transfer_certificate', 'tenth_marksheet', 'twelfth_marksheet', 'photo', 'aadhaar_card', 'leaving_certificate'],
    optionalDocuments: [],
    fee: 500,
    displayOrder: 6,
    isActive: true,
  },
  {
    name: 'Branch Change',
    slug: 'branch_change',
    description: 'Change of branch within the same college',
    requiredDocuments: ['previous_year_marksheet', 'fee_receipt', 'tenth_marksheet', 'twelfth_marksheet', 'photo', 'aadhaar_card'],
    optionalDocuments: [],
    fee: 500,
    displayOrder: 7,
    isActive: true,
  },
];

// ──────────────────────────────────────────────────
// STUDENT SEED DATA — 56 students across 7 types × 8 each
// ──────────────────────────────────────────────────
const firstNames = [
  'Rahul', 'Priya', 'Amit', 'Sneha', 'Raj', 'Anjali', 'Vikram', 'Neha',
  'Sanjay', 'Pooja', 'Karan', 'Divya', 'Arjun', 'Shweta', 'Rohan', 'Megha',
  'Ajay', 'Shalini', 'Deepak', 'Kavita', 'Suresh', 'Lakshmi', 'Gopal', 'Radhika',
  'Harshal', 'Aishwarya', 'Nikhil', 'Riya', 'Pratik', 'Aditi', 'Siddharth', 'Tanvi',
  'Omkar', 'Isha', 'Yash', 'Rutuja', 'Sahil', 'Mrunal', 'Tejas', 'Vaishnavi',
  'Atharva', 'Sayali', 'Prathamesh', 'Sakshi', 'Soham', 'Shruti', 'Sarthak', 'Maya',
  'Chirag', 'Nandini', 'Vivek', 'Trupti', 'Manish', 'Shravani', 'Harsh', 'Prachi',
];

const lastNames = [
  'Sharma', 'Patel', 'Kumar', 'Joshi', 'Malhotra', 'Singh', 'Reddy', 'Agarwal',
  'Nair', 'Iyer', 'Shah', 'Menon', 'Das', 'Rao', 'Mehta', 'Pandey',
  'Verma', 'Kulkarni', 'Chopra', 'Desai', 'Bhatia', 'Pillai', 'Srinivasan', 'Mukherjee',
  'Kale', 'Mahajan', 'Sawant', 'Chavan', 'Patil', 'Jadhav', 'More', 'Gokhale',
  'Pawar', 'Bhosale', 'Salvi', 'Deshmukh', 'Wagh', 'Kadam', 'Gawande', 'Thakur',
  'Borse', 'Jagtap', 'Kshirsagar', 'Bhandari', 'Mane', 'Ghadge', 'Shelke', 'Kamat',
  'Parab', 'Naik', 'Shenoy', 'Mhatre', 'Dubey', 'Tripathi', 'Saxena', 'Pathak',
];

const statuses: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'MERIT_LIST', 'SEAT_ALLOCATED'];

const cities = ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur'];
const streets = ['MG Road', 'Station Road', 'College Road', 'Main Street', 'Park Avenue', 'Lake Road', 'Market Street', 'Temple Road'];

const diplomaColleges = [
  'Government Polytechnic Mumbai', 'VJTI Polytechnic', 'K J Somaiya Polytechnic',
  'Pune Polytechnic', 'Shriram Polytechnic', 'Government Polytechnic Nagpur',
  'Government Polytechnic Pune', 'Government Polytechnic Nashik',
];

const previousColleges = [
  'Pune Institute of Technology', 'Mumbai University', 'Bharti Vidyapeeth',
  'MIT World Peace University', 'DY Patil College', 'Sandip University',
  'Vishwakarma Institute of Technology', 'Sinhgad College of Engineering',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateApplicationId(prefix: string, count: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count).padStart(6, '0')}`;
}

function buildStatusHistory(finalStatus: ApplicationStatus): { status: ApplicationStatus; changedAt: Date }[] {
  const history: { status: ApplicationStatus; changedAt: Date }[] = [];
  history.push({ status: 'DRAFT', changedAt: new Date(Date.now() - getRandomInt(10, 20) * 86400000) });
  if (finalStatus === 'DRAFT') return history;

  history.push({ status: 'SUBMITTED', changedAt: new Date(Date.now() - getRandomInt(5, 15) * 86400000) });
  if (finalStatus === 'SUBMITTED') return history;

  if (['UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REVISION_REQUESTED', 'MERIT_LIST', 'SEAT_ALLOCATED', 'FEE_PAID', 'ADMISSION_CONFIRMED'].includes(finalStatus)) {
    history.push({ status: 'UNDER_REVIEW', changedAt: new Date(Date.now() - getRandomInt(3, 10) * 86400000) });
  }
  if (finalStatus === 'UNDER_REVIEW') return history;

  if (['VERIFIED', 'REJECTED', 'MERIT_LIST', 'SEAT_ALLOCATED', 'FEE_PAID', 'ADMISSION_CONFIRMED'].includes(finalStatus)) {
    history.push({ status: 'VERIFIED', changedAt: new Date(Date.now() - getRandomInt(2, 7) * 86400000) });
  }
  if (finalStatus === 'VERIFIED') return history;

  if (finalStatus === 'REJECTED') {
    history.push({ status: 'REJECTED', changedAt: new Date(Date.now() - getRandomInt(1, 4) * 86400000) });
    return history;
  }

  if (['MERIT_LIST', 'SEAT_ALLOCATED', 'FEE_PAID', 'ADMISSION_CONFIRMED'].includes(finalStatus)) {
    history.push({ status: 'MERIT_LIST', changedAt: new Date(Date.now() - getRandomInt(2, 6) * 86400000) });
  }
  if (finalStatus === 'MERIT_LIST') return history;

  if (['SEAT_ALLOCATED', 'FEE_PAID', 'ADMISSION_CONFIRMED'].includes(finalStatus)) {
    history.push({ status: 'SEAT_ALLOCATED', changedAt: new Date(Date.now() - getRandomInt(1, 4) * 86400000) });
  }
  if (finalStatus === 'SEAT_ALLOCATED') return history;

  if (['FEE_PAID', 'ADMISSION_CONFIRMED'].includes(finalStatus)) {
    history.push({ status: 'FEE_PAID', changedAt: new Date(Date.now() - getRandomInt(1, 3) * 86400000) });
  }
  if (finalStatus === 'FEE_PAID') return history;

  if (finalStatus === 'ADMISSION_CONFIRMED') {
    history.push({ status: 'ADMISSION_CONFIRMED', changedAt: new Date(Date.now() - getRandomInt(0, 2) * 86400000) });
  }

  return history;
}

// Build 56 student configs: 8 per admission type
function buildStudentConfigs(): StudentSeed[] {
  const configs: StudentSeed[] = [];
  const types: AdmissionTypeValue[] = [
    'POLYTECHNIC',
    'ENGINEERING_FIRST_YEAR',
    'DIRECT_SECOND_YEAR',
    'DIRECT_SECOND_YEAR_DIPLOMA',
    'DIRECT_SECOND_YEAR_FE',
    'COLLEGE_TRANSFER',
    'BRANCH_CHANGE',
  ];

  let idx = 0;
  for (const admissionType of types) {
    for (let j = 0; j < 8; j++) {
      configs.push({
        firstName: firstNames[idx % firstNames.length],
        lastName: lastNames[idx % lastNames.length],
        admissionType,
        emailSuffix: `${admissionType.toLowerCase()}.${j + 1}`,
        status: statuses[j % statuses.length],
        hasSecondary: j % 3 === 0,
      });
      idx++;
    }
  }
  return configs;
}

// ──────────────────────────────────────────────────
// MAIN SEED
// ──────────────────────────────────────────────────
async function seedAll() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // 1. Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await Promise.all([
      Application.deleteMany({}),
      User.deleteMany({}),
      Role.deleteMany({}),
      Course.deleteMany({}),
      Category.deleteMany({}),
      AdmissionType.deleteMany({}),
      ContactInquiry.deleteMany({}),
    ]);
    console.log('   All collections cleared.');

    // 2. Create roles
    console.log('\n👥 Creating roles...');
    const roleMap = new Map<string, mongoose.Types.ObjectId>();
    for (const role of roles) {
      const created = await Role.create(role);
      roleMap.set(role.name, created._id);
      console.log(`   ✅ ${role.name}`);
    }

    // 3. Create admin/superadmin users
    console.log('\n👤 Creating admin users...');
    for (const admin of adminUsers) {
      const roleId = roleMap.get(admin.roleName)!;
      await User.create({
        email: admin.email,
        mobile: admin.mobile,
        password: admin.password,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: roleId,
        isActive: true,
      });
      console.log(`   ✅ ${admin.email} / ${admin.password}`);
    }

    // 4. Create categories
    console.log('\n📂 Creating categories...');
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const cat of categories) {
      const created = await Category.create(cat);
      categoryMap.set(cat.slug, created._id);
      console.log(`   ✅ ${cat.name}`);
    }

    // 5. Create courses
    console.log('\n📚 Creating courses...');
    for (const course of courseDefs) {
      const categoryId = categoryMap.get(course.categorySlug);
      if (categoryId) {
        await Course.create({ ...course, category: categoryId, isActive: true });
      }
    }
    console.log(`   ✅ ${courseDefs.length} courses created`);

    // 6. Create admission types
    console.log('\n🎯 Creating admission types...');
    for (const at of admissionTypes) {
      await AdmissionType.create(at);
      console.log(`   ✅ ${at.name} (${at.slug})`);
    }

    // 7. Create sample inquiries
    console.log('\n💬 Creating sample inquiries...');
    const inquiryData = [
      { name: 'Rahul Sharma', email: 'rahul.seed@example.com', mobile: '9876543001', subject: 'BCA Eligibility', message: 'What is the minimum percentage required for BCA admission?', status: 'PENDING' },
      { name: 'Priya Patel', email: 'priya.seed@example.com', mobile: '9876543002', subject: 'Engineering Fees', message: 'What is the total fee structure for BE Computer Engineering?', status: 'PENDING' },
      { name: 'Amit Kumar', email: 'amit.seed@example.com', mobile: '9876543003', subject: 'Hostel Query', message: 'Is hostel accommodation available for outstation students?', status: 'RESOLVED' },
      { name: 'Sneha Joshi', email: 'sneha.seed@example.com', mobile: '9876543004', subject: 'Scholarship', message: 'Do you offer merit-based scholarships for engineering students?', status: 'PENDING' },
      { name: 'Raj Malhotra', email: 'raj.seed@example.com', mobile: '9876543005', subject: 'Direct Second Year', message: 'Can I get direct admission to second year after diploma?', status: 'RESOLVED' },
      { name: 'Anjali Singh', email: 'anjali.seed@example.com', mobile: '9876543006', subject: 'CET Score', message: 'What is the cutoff CET score for Computer Engineering?', status: 'PENDING' },
    ];
    await ContactInquiry.insertMany(inquiryData);
    console.log(`   ✅ ${inquiryData.length} inquiries created`);

    // 8. Clear old student data
    await Application.deleteMany({});
    const studentRole = roleMap.get('Student')!;
    const existingStudents = await User.find({ role: studentRole });
    if (existingStudents.length > 0) {
      await User.deleteMany({ role: studentRole });
      console.log('   Cleared existing student users');
    }

    // 9. Create students with applications
    console.log('\n🎓 Creating students with applications...');

    const allCourses = await Course.find().lean();
    if (allCourses.length === 0) {
      console.error('No courses found!');
      process.exit(1);
    }

    const allCategories = await Category.find().lean();
    const categoryDomainMap = new Map<string, string>();
    for (const cat of allCategories) {
      categoryDomainMap.set(cat._id.toString(), cat.domain);
    }

    const studentConfigs = buildStudentConfigs();
    let appsCreated = 0;
    const typeCounts: Record<string, number> = {};

    for (let i = 0; i < studentConfigs.length; i++) {
      const cfg = studentConfigs[i];
      const email = `student.${cfg.emailSuffix}@test.com`;
      const mobile = `98765${String(50000 + i).padStart(5, '0')}`;

      // Create user
      const user = await User.create({
        email,
        mobile,
        password: 'Test@123',
        firstName: cfg.firstName,
        lastName: cfg.lastName,
        role: studentRole,
        isActive: true,
      });

      // Filter courses by admission type domain
      const allowedDomains = ADMISSION_TYPE_DOMAINS[cfg.admissionType];
      const eligibleCourses = allCourses.filter((c: any) => {
        const catId = c.category?._id?.toString() || c.category?.toString();
        const domain = categoryDomainMap.get(catId);
        return domain && allowedDomains.includes(domain);
      });

      if (eligibleCourses.length === 0) {
        console.warn(`   ⚠️ No eligible courses for ${cfg.admissionType}, falling back to all courses`);
      }

      const pool = eligibleCourses.length > 0 ? eligibleCourses : allCourses;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const course1 = shuffled[0] as any;
      const cat1 = course1.category;
      let course2: any = null;
      let cat2: any = null;
      if (cfg.hasSecondary) {
        const diff = shuffled.find((c: any) => {
          const cId = c.category._id || c.category;
          const cat1Id = cat1._id || cat1;
          return cId.toString() !== cat1Id.toString();
        });
        course2 = diff || shuffled[1];
        cat2 = course2?.category;
      }

      const status = cfg.status;
      const prefix = ADMISSION_PREFIX[cfg.admissionType] || 'CAP';
      typeCounts[cfg.admissionType] = (typeCounts[cfg.admissionType] || 0) + 1;
      const seqNum = typeCounts[cfg.admissionType];

      const statusHistory = buildStatusHistory(status);

      const appData: any = {
        applicationId: generateApplicationId(prefix, i + 1),
        user: user._id,
        name: `${cfg.firstName} ${cfg.lastName}`,
        email: user.email,
        address: `${getRandomInt(1, 999)}, ${getRandomElement(streets)}, ${getRandomElement(cities)} ${getRandomInt(400001, 449999)}`,
        admissionType: cfg.admissionType,
        category: course1.category._id || course1.category,
        primaryCourse: course1._id,
        secondaryCourse: course2 ? course2._id : undefined,
        category2: course2 ? (cat2._id || cat2) : undefined,
        primaryCourse2: course2 ? course2._id : undefined,
        status,
        statusHistory,
        allocatedCourse: (status === 'SEAT_ALLOCATED' || status === 'FEE_PAID' || status === 'ADMISSION_CONFIRMED') ? course1._id : undefined,
        isActive: true,
        documents: [],
        submittedAt: status !== 'DRAFT' ? new Date(Date.now() - getRandomInt(2, 14) * 86400000) : undefined,
        meritRank: status === 'MERIT_LIST' || status === 'SEAT_ALLOCATED' || status === 'FEE_PAID' || status === 'ADMISSION_CONFIRMED' ? getRandomInt(1, 50) : undefined,
        createdBy: user._id,
        updatedBy: user._id,
      };

      // Common documents
      appData.documents.push(
        { type: 'tenth_marksheet' as const, url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
        { type: 'photo' as const, url: 'https://res.cloudinary.com/sample/photo.jpg', publicId: 'sample_photo', uploadedAt: new Date() },
        { type: 'aadhaar_card' as const, url: 'https://res.cloudinary.com/sample/aadhaar.pdf', publicId: 'sample_aadhaar', uploadedAt: new Date() },
      );

      // Admission-type-specific fields
      switch (cfg.admissionType) {
        case 'POLYTECHNIC':
          appData.tenthMarks = getRandomInt(55, 92);
          appData.documents.push({ type: 'leaving_certificate' as const, url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() });
          break;

        case 'ENGINEERING_FIRST_YEAR':
          appData.tenthMarks = getRandomInt(65, 96);
          appData.twelfthMarks = getRandomInt(60, 94);
          appData.cetScore = getRandomInt(50, 192);
          if (Math.random() > 0.4) appData.jeeScore = getRandomInt(40, 185);
          appData.documents.push(
            { type: 'twelfth_marksheet' as const, url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'cet_result' as const, url: 'https://res.cloudinary.com/sample/cet_result.pdf', publicId: 'sample_cet', uploadedAt: new Date() },
            { type: 'leaving_certificate' as const, url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          );
          if (appData.jeeScore) {
            appData.documents.push({ type: 'jee_result' as const, url: 'https://res.cloudinary.com/sample/jee_result.pdf', publicId: 'sample_jee', uploadedAt: new Date() });
          }
          break;

        case 'DIRECT_SECOND_YEAR':
        case 'DIRECT_SECOND_YEAR_DIPLOMA':
          appData.tenthMarks = getRandomInt(55, 88);
          appData.diplomaCollege = getRandomElement(diplomaColleges);
          appData.diplomaCgpa = parseFloat((Math.random() * 3 + 6).toFixed(2));
          appData.diplomaPercentage = getRandomInt(60, 94);
          appData.diplomaYearOfPassing = getRandomInt(2023, 2025);
          appData.documents.push(
            { type: 'diploma_marksheet' as const, url: 'https://res.cloudinary.com/sample/diploma_marksheet.pdf', publicId: 'sample_diploma_ms', uploadedAt: new Date() },
            { type: 'diploma_certificate' as const, url: 'https://res.cloudinary.com/sample/diploma_cert.pdf', publicId: 'sample_diploma_cert', uploadedAt: new Date() },
            { type: 'migration_certificate' as const, url: 'https://res.cloudinary.com/sample/migration_cert.pdf', publicId: 'sample_migration', uploadedAt: new Date() },
            { type: 'leaving_certificate' as const, url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          );
          break;

        case 'DIRECT_SECOND_YEAR_FE':
          appData.tenthMarks = getRandomInt(65, 95);
          appData.twelfthMarks = getRandomInt(60, 92);
          appData.cetScore = getRandomInt(50, 185);
          appData.jeeScore = Math.random() > 0.5 ? getRandomInt(40, 180) : undefined;
          appData.previousCollegeName = getRandomElement(previousColleges);
          appData.previousCollegeAddress = `${getRandomElement(cities)}, Maharashtra`;
          {
            const uniqueCats = allCourses.reduce((acc: any[], c: any) => {
              const cId = c.category._id?.toString() || c.category?.toString();
              const cat1Id = cat1._id?.toString() || cat1?.toString();
              if (cId && cId !== cat1Id && !acc.find(a => (a._id?.toString() || a.toString()) === cId)) {
                acc.push(c.category);
              }
              return acc;
            }, []);
            if (uniqueCats.length > 0) {
              appData.previousCategory = uniqueCats[getRandomInt(0, uniqueCats.length - 1)]._id || uniqueCats[getRandomInt(0, uniqueCats.length - 1)];
            }
          }
          appData.documents.push(
            { type: 'first_year_marksheet' as const, url: 'https://res.cloudinary.com/sample/first_year_ms.pdf', publicId: 'sample_fy_ms', uploadedAt: new Date() },
            { type: 'previous_college_bonafide' as const, url: 'https://res.cloudinary.com/sample/bonafide.pdf', publicId: 'sample_bonafide', uploadedAt: new Date() },
            { type: 'twelfth_marksheet' as const, url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'leaving_certificate' as const, url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          );
          break;

        case 'COLLEGE_TRANSFER':
          appData.tenthMarks = getRandomInt(60, 90);
          appData.twelfthMarks = getRandomInt(55, 88);
          appData.transferType = 'TRANSFER';
          appData.previousCollegeName = getRandomElement(previousColleges);
          appData.previousCollegeAddress = `${getRandomElement(cities)}, Maharashtra`;
          appData.documents.push(
            { type: 'twelfth_marksheet' as const, url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'previous_college_bonafide' as const, url: 'https://res.cloudinary.com/sample/bonafide.pdf', publicId: 'sample_bonafide', uploadedAt: new Date() },
            { type: 'previous_year_marksheet' as const, url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf', publicId: 'sample_prev_ms', uploadedAt: new Date() },
            { type: 'transfer_certificate' as const, url: 'https://res.cloudinary.com/sample/transfer_cert.pdf', publicId: 'sample_transfer', uploadedAt: new Date() },
            { type: 'leaving_certificate' as const, url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          );
          break;

        case 'BRANCH_CHANGE':
          appData.tenthMarks = getRandomInt(65, 92);
          appData.twelfthMarks = getRandomInt(60, 90);
          appData.cetScore = getRandomInt(80, 178);
          appData.transferType = 'BRANCH_CHANGE';
          appData.previousCollegeName = 'Sandip University';
          appData.previousCollegeAddress = 'Nashik, Maharashtra';
          appData.documents.push(
            { type: 'twelfth_marksheet' as const, url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'previous_year_marksheet' as const, url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf', publicId: 'sample_prev_ms', uploadedAt: new Date() },
            { type: 'fee_receipt' as const, url: 'https://res.cloudinary.com/sample/fee_receipt.pdf', publicId: 'sample_fee', uploadedAt: new Date() },
          );
          break;
      }

      await Application.create(appData);
      appsCreated++;
      console.log(`   [${String(i + 1).padStart(2, '0')}/${studentConfigs.length}] ✅ ${cfg.admissionType} → ${cfg.firstName} ${cfg.lastName} (${status})`);
    }

    // ──────────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Roles:          ${roles.length}`);
    console.log(`   Admin Users:    ${adminUsers.length}`);
    console.log(`   Categories:     ${categories.length}`);
    console.log(`   Courses:        ${courseDefs.length}`);
    console.log(`   Admission Types: ${admissionTypes.length}`);
    console.log(`   Inquiries:      ${inquiryData.length}`);
    console.log(`   Students/Apps:  ${appsCreated}`);
    console.log(`\n🔑 Admin Login:`);
    console.log(`   Super Admin:    superadmin@sycet.org / SuperAdmin@123`);
    console.log(`   Admin:          admin@sycet.org / Admin@123`);
    console.log(`\n🔑 Student Login (all passwords: Test@123):`);
    for (const cfg of studentConfigs) {
      console.log(`   student.${cfg.emailSuffix}@test.com`);
    }
    console.log('\n📋 Application Status Distribution:');
    const statusDist: Record<string, number> = {};
    for (const cfg of studentConfigs) {
      statusDist[cfg.status] = (statusDist[cfg.status] || 0) + 1;
    }
    for (const [s, c] of Object.entries(statusDist)) {
      console.log(`   ${s}: ${c}`);
    }
    console.log('\n🎯 Admission Type Distribution:');
    const typeDist: Record<string, number> = {};
    for (const cfg of studentConfigs) {
      typeDist[cfg.admissionType] = (typeDist[cfg.admissionType] || 0) + 1;
    }
    for (const [t, c] of Object.entries(typeDist)) {
      console.log(`   ${t}: ${c}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed error:', error);
    process.exit(1);
  }
}

seedAll();
