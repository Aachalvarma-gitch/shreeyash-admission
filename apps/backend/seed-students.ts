import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Course.model.js';
import Category from './models/Category.model.js';
import Role from './models/Role.model.js';
import User from './models/User.model.js';
import Application from './models/Application.model.js';

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

const studentNames = [
  { firstName: 'Rahul', lastName: 'Sharma' },
  { firstName: 'Priya', lastName: 'Patel' },
  { firstName: 'Amit', lastName: 'Kumar' },
  { firstName: 'Sneha', lastName: 'Joshi' },
  { firstName: 'Raj', lastName: 'Malhotra' },
  { firstName: 'Anjali', lastName: 'Singh' },
  { firstName: 'Vikram', lastName: 'Reddy' },
  { firstName: 'Neha', lastName: 'Agarwal' },
  { firstName: 'Sanjay', lastName: 'Nair' },
  { firstName: 'Pooja', lastName: 'Iyer' },
  { firstName: 'Karan', lastName: 'Shah' },
  { firstName: 'Divya', lastName: 'Menon' },
  { firstName: 'Arjun', lastName: 'Das' },
  { firstName: 'Shweta', lastName: 'Rao' },
  { firstName: 'Rohan', lastName: 'Mehta' },
  { firstName: 'Megha', lastName: 'Pandey' },
  { firstName: 'Ajay', lastName: 'Verma' },
  { firstName: 'Shalini', lastName: 'Kulkarni' },
  { firstName: 'Deepak', lastName: 'Chopra' },
  { firstName: 'Kavita', lastName: 'Desai' },
  { firstName: 'Suresh', lastName: 'Bhatia' },
  { firstName: 'Lakshmi', lastName: 'Pillai' },
  { firstName: 'Gopal', lastName: 'Srinivasan' },
  { firstName: 'Radhika', lastName: 'Mukherjee' },
  { firstName: 'Harshal', lastName: 'Kale' },
  { firstName: 'Aishwarya', lastName: 'Mahajan' },
  { firstName: 'Nikhil', lastName: 'Sawant' },
  { firstName: 'Riya', lastName: 'Chavan' },
  { firstName: 'Pratik', lastName: 'Patil' },
  { firstName: 'Aditi', lastName: 'Jadhav' },
  { firstName: 'Siddharth', lastName: 'More' },
  { firstName: 'Tanvi', lastName: 'Gokhale' },
  { firstName: 'Omkar', lastName: 'Pawar' },
  { firstName: 'Isha', lastName: 'Bhosale' },
  { firstName: 'Yash', lastName: 'Salvi' },
];

const applicationStatuses = [
  'DRAFT',
  'SUBMITTED', 'SUBMITTED', 'SUBMITTED',
  'UNDER_REVIEW', 'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'MERIT_LIST',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateApplicationId(prefix: string, index: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(index + 1).padStart(6, '0')}`;
}

// ─── Admission Type Definitions ────────────────────────────────────────────
type AdmissionType = 'POLYTECHNIC' | 'ENGINEERING_FIRST_YEAR' | 'DIRECT_SECOND_YEAR' | 'DIRECT_SECOND_YEAR_DIPLOMA' | 'DIRECT_SECOND_YEAR_FE' | 'COLLEGE_TRANSFER' | 'BRANCH_CHANGE';

interface StudentConfig {
  nameIdx: number;
  admissionType: AdmissionType;
  suffix: string;
  statusIdx: number;
  hasSecondary: boolean;
}

// 7 students per admission type (DSY_FE added from 3 → 7) = 39 total
const configs: StudentConfig[] = [
  // ── POLYTECHNIC (7) ──
  { nameIdx: 0, admissionType: 'POLYTECHNIC', suffix: '1', statusIdx: 0, hasSecondary: false },
  { nameIdx: 5, admissionType: 'POLYTECHNIC', suffix: '2', statusIdx: 1, hasSecondary: false },
  { nameIdx: 10, admissionType: 'POLYTECHNIC', suffix: '3', statusIdx: 2, hasSecondary: true },
  { nameIdx: 15, admissionType: 'POLYTECHNIC', suffix: '4', statusIdx: 3, hasSecondary: false },
  { nameIdx: 20, admissionType: 'POLYTECHNIC', suffix: '5', statusIdx: 4, hasSecondary: true },
  { nameIdx: 25, admissionType: 'POLYTECHNIC', suffix: '6', statusIdx: 6, hasSecondary: false },
  { nameIdx: 30, admissionType: 'POLYTECHNIC', suffix: '7', statusIdx: 7, hasSecondary: false },

  // ── ENGINEERING_FIRST_YEAR (7) ──
  { nameIdx: 1, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '1', statusIdx: 0, hasSecondary: true },
  { nameIdx: 6, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '2', statusIdx: 1, hasSecondary: false },
  { nameIdx: 11, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '3', statusIdx: 2, hasSecondary: true },
  { nameIdx: 16, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '4', statusIdx: 3, hasSecondary: true },
  { nameIdx: 21, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '5', statusIdx: 4, hasSecondary: false },
  { nameIdx: 26, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '6', statusIdx: 5, hasSecondary: true },
  { nameIdx: 31, admissionType: 'ENGINEERING_FIRST_YEAR', suffix: '7', statusIdx: 8, hasSecondary: false },

  // ── DIRECT_SECOND_YEAR_DIPLOMA (4) ──
  { nameIdx: 2, admissionType: 'DIRECT_SECOND_YEAR_DIPLOMA', suffix: '1', statusIdx: 0, hasSecondary: true },
  { nameIdx: 7, admissionType: 'DIRECT_SECOND_YEAR_DIPLOMA', suffix: '2', statusIdx: 1, hasSecondary: false },
  { nameIdx: 12, admissionType: 'DIRECT_SECOND_YEAR_DIPLOMA', suffix: '3', statusIdx: 2, hasSecondary: true },
  { nameIdx: 17, admissionType: 'DIRECT_SECOND_YEAR_DIPLOMA', suffix: '4', statusIdx: 3, hasSecondary: false },

  // ── DIRECT_SECOND_YEAR_FE (7) ──
  { nameIdx: 22, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '1', statusIdx: 4, hasSecondary: true },
  { nameIdx: 27, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '2', statusIdx: 6, hasSecondary: false },
  { nameIdx: 32, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '3', statusIdx: 7, hasSecondary: true },
  { nameIdx: 8, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '4', statusIdx: 1, hasSecondary: false },
  { nameIdx: 13, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '5', statusIdx: 2, hasSecondary: true },
  { nameIdx: 18, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '6', statusIdx: 5, hasSecondary: true },
  { nameIdx: 24, admissionType: 'DIRECT_SECOND_YEAR_FE', suffix: '7', statusIdx: 8, hasSecondary: false },

  // ── COLLEGE_TRANSFER (7) ──
  { nameIdx: 3, admissionType: 'COLLEGE_TRANSFER', suffix: '1', statusIdx: 0, hasSecondary: false },
  { nameIdx: 8, admissionType: 'COLLEGE_TRANSFER', suffix: '2', statusIdx: 1, hasSecondary: false },
  { nameIdx: 13, admissionType: 'COLLEGE_TRANSFER', suffix: '3', statusIdx: 2, hasSecondary: true },
  { nameIdx: 18, admissionType: 'COLLEGE_TRANSFER', suffix: '4', statusIdx: 4, hasSecondary: false },
  { nameIdx: 23, admissionType: 'COLLEGE_TRANSFER', suffix: '5', statusIdx: 5, hasSecondary: false },
  { nameIdx: 28, admissionType: 'COLLEGE_TRANSFER', suffix: '6', statusIdx: 6, hasSecondary: false },
  { nameIdx: 33, admissionType: 'COLLEGE_TRANSFER', suffix: '7', statusIdx: 7, hasSecondary: true },

  // ── BRANCH_CHANGE (7) ──
  { nameIdx: 4, admissionType: 'BRANCH_CHANGE', suffix: '1', statusIdx: 0, hasSecondary: false },
  { nameIdx: 9, admissionType: 'BRANCH_CHANGE', suffix: '2', statusIdx: 1, hasSecondary: false },
  { nameIdx: 14, admissionType: 'BRANCH_CHANGE', suffix: '3', statusIdx: 2, hasSecondary: false },
  { nameIdx: 19, admissionType: 'BRANCH_CHANGE', suffix: '4', statusIdx: 3, hasSecondary: false },
  { nameIdx: 24, admissionType: 'BRANCH_CHANGE', suffix: '5', statusIdx: 4, hasSecondary: false },
  { nameIdx: 29, admissionType: 'BRANCH_CHANGE', suffix: '6', statusIdx: 6, hasSecondary: false },
  { nameIdx: 34, admissionType: 'BRANCH_CHANGE', suffix: '7', statusIdx: 7, hasSecondary: false },
];

async function seedStudentApplications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const courses = await Course.find().lean();
    const studentRole = await Role.findOne({ name: 'Student' });

    if (!studentRole) {
      console.log('Student role not found. Run main seed first.');
      process.exit(1);
    }

    if (courses.length === 0) {
      console.log('No courses found. Run main seed first.');
      process.exit(1);
    }

    console.log(`\n📚 Found ${courses.length} courses`);

    let applicationsCreated = 0;
    let typeCounts: Record<string, number> = {};

    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const nameInfo = studentNames[cfg.nameIdx];
      const email = `student.${cfg.admissionType.toLowerCase()}.${cfg.suffix}@test.com`;

      const existingUser = await User.findOne({ email });
      let user: any;

      if (existingUser) {
        user = existingUser;
        console.log(`  User ${email} already exists, using existing`);
      } else {
        user = await User.create({
          email,
          mobile: `98765${String(40000 + i).padStart(5, '0')}`,
          password: 'Test@123',
          firstName: nameInfo.firstName,
          lastName: `${nameInfo.lastName}`,
          role: studentRole._id,
          isActive: true,
        });
        console.log(`  Created user: ${email}`);
      }

      const existingApp = await Application.findOne({ user: user._id });
      if (existingApp) {
        console.log(`  Application for ${email} already exists, skipping`);
        continue;
      }

      // Pick courses from different categories for section 1 and section 2
      const shuffled = [...courses].sort(() => Math.random() - 0.5);
      const course1 = shuffled[0] as any;
      const cat1 = course1.category;
      let course2: any = null;
      let cat2: any = null;
      if (cfg.hasSecondary) {
        const diffCategory = shuffled.find((c: any) => {
          const cCat = c.category._id || c.category;
          const cat1Id = cat1._id || cat1;
          return cCat.toString() !== cat1Id.toString();
        });
        course2 = diffCategory || shuffled[1] || shuffled[0];
        cat2 = course2.category;
      }

      const status = applicationStatuses[cfg.statusIdx];
      const prefix = ADMISSION_PREFIX[cfg.admissionType] || 'CAP';
      const typeCount = (typeCounts[cfg.admissionType] || 0) + 1;
      typeCounts[cfg.admissionType] = typeCount;

      const statusHistory: any[] = [
        { status: 'DRAFT', changedAt: new Date(Date.now() - getRandomInt(5, 15) * 24 * 60 * 60 * 1000) },
      ];

      if (status !== 'DRAFT') {
        statusHistory.push({
          status: 'SUBMITTED',
          changedAt: new Date(Date.now() - getRandomInt(2, 8) * 24 * 60 * 60 * 1000),
        });
      }

      if (['UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'MERIT_LIST'].includes(status)) {
        statusHistory.push({
          status,
          changedAt: new Date(Date.now() - getRandomInt(1, 4) * 24 * 60 * 60 * 1000),
        });
      }

      // Build base app data
      const appData: any = {
        applicationId: generateApplicationId(prefix, typeCount),
        user: user._id,
        name: `${nameInfo.firstName} ${nameInfo.lastName}`,
        email: user.email,
        address: `${getRandomInt(1, 999)}, ${['MG Road', 'Station Road', 'College Road', 'Main Street', 'Park Avenue'][getRandomInt(0, 4)]}, ${['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'][getRandomInt(0, 4)]} ${getRandomInt(400001, 449999)}`,
        admissionType: cfg.admissionType,
        category: course1.category._id || course1.category,
        primaryCourse: course1._id,
        secondaryCourse: course2 ? course2._id : undefined,
        category2: course2 ? (cat2._id || cat2) : undefined,
        primaryCourse2: course2 ? course2._id : undefined,
        secondaryCourse2: undefined,
        status,
        statusHistory,
        allocatedCourse: (status === 'MERIT_LIST') ? course1._id : undefined,
        isActive: true,
        documents: [
          {
            type: 'tenth_marksheet',
            url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf',
            publicId: 'sample_tenth',
            uploadedAt: new Date(),
          },
          {
            type: 'photo',
            url: 'https://res.cloudinary.com/sample/photo.jpg',
            publicId: 'sample_photo',
            uploadedAt: new Date(),
          },
          {
            type: 'aadhaar_card',
            url: 'https://res.cloudinary.com/sample/aadhaar.pdf',
            publicId: 'sample_aadhaar',
            uploadedAt: new Date(),
          },
        ],
        createdBy: user._id,
        updatedBy: user._id,
      };

      // ── Admission-type-specific fields & documents ──────────────────────

      switch (cfg.admissionType) {
        case 'POLYTECHNIC':
          appData.tenthMarks = getRandomInt(55, 90);
          appData.documents.push({
            type: 'leaving_certificate',
            url: 'https://res.cloudinary.com/sample/leaving_cert.pdf',
            publicId: 'sample_leaving',
            uploadedAt: new Date(),
          });
          break;

        case 'ENGINEERING_FIRST_YEAR':
          appData.tenthMarks = getRandomInt(65, 95);
          appData.twelfthMarks = getRandomInt(60, 92);
          appData.cetScore = getRandomInt(80, 185);
          appData.jeeScore = Math.random() > 0.4 ? getRandomInt(60, 180) : undefined;
          appData.documents.push(
            {
              type: 'twelfth_marksheet',
              url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf',
              publicId: 'sample_twelfth',
              uploadedAt: new Date(),
            },
            {
              type: 'cet_result',
              url: 'https://res.cloudinary.com/sample/cet_result.pdf',
              publicId: 'sample_cet',
              uploadedAt: new Date(),
            },
            {
              type: 'leaving_certificate',
              url: 'https://res.cloudinary.com/sample/leaving_cert.pdf',
              publicId: 'sample_leaving',
              uploadedAt: new Date(),
            }
          );
          break;

        case 'DIRECT_SECOND_YEAR':
          appData.tenthMarks = getRandomInt(55, 85);
          appData.diplomaCollege = ['Government Polytechnic Mumbai', 'VJTI Polytechnic', 'K J Somaiya Polytechnic', 'Pune Polytechnic', 'Shriram Polytechnic'][getRandomInt(0, 4)];
          appData.diplomaCgpa = parseFloat((Math.random() * 3 + 6).toFixed(2));
          appData.diplomaPercentage = getRandomInt(60, 92);
          appData.diplomaYearOfPassing = 2025;
          appData.documents.push(
            {
              type: 'diploma_marksheet',
              url: 'https://res.cloudinary.com/sample/diploma_marksheet.pdf',
              publicId: 'sample_diploma_ms',
              uploadedAt: new Date(),
            },
            {
              type: 'diploma_certificate',
              url: 'https://res.cloudinary.com/sample/diploma_cert.pdf',
              publicId: 'sample_diploma_cert',
              uploadedAt: new Date(),
            },
            {
              type: 'leaving_certificate',
              url: 'https://res.cloudinary.com/sample/leaving_cert.pdf',
              publicId: 'sample_leaving',
              uploadedAt: new Date(),
            },
            {
              type: 'migration_certificate',
              url: 'https://res.cloudinary.com/sample/migration_cert.pdf',
              publicId: 'sample_migration',
              uploadedAt: new Date(),
            }
          );
          break;

        case 'DIRECT_SECOND_YEAR_DIPLOMA':
          appData.tenthMarks = getRandomInt(55, 85);
          appData.diplomaCollege = ['Government Polytechnic Mumbai', 'VJTI Polytechnic', 'K J Somaiya Polytechnic', 'Pune Polytechnic', 'Shriram Polytechnic'][getRandomInt(0, 4)];
          appData.diplomaCgpa = parseFloat((Math.random() * 3 + 6).toFixed(2));
          appData.diplomaPercentage = getRandomInt(60, 92);
          appData.diplomaYearOfPassing = 2025;
          appData.documents.push(
            {
              type: 'diploma_marksheet',
              url: 'https://res.cloudinary.com/sample/diploma_marksheet.pdf',
              publicId: 'sample_diploma_ms',
              uploadedAt: new Date(),
            },
            {
              type: 'diploma_certificate',
              url: 'https://res.cloudinary.com/sample/diploma_cert.pdf',
              publicId: 'sample_diploma_cert',
              uploadedAt: new Date(),
            },
            {
              type: 'migration_certificate',
              url: 'https://res.cloudinary.com/sample/migration_cert.pdf',
              publicId: 'sample_migration',
              uploadedAt: new Date(),
            }
          );
          break;

        case 'DIRECT_SECOND_YEAR_FE':
          appData.tenthMarks = getRandomInt(65, 95);
          appData.twelfthMarks = getRandomInt(60, 92);
          appData.cetScore = getRandomInt(80, 185);
          appData.jeeScore = Math.random() > 0.4 ? getRandomInt(60, 180) : undefined;
          appData.previousCollegeName = ['Pune Institute of Technology', 'Mumbai University', 'Bharti Vidyapeeth', 'MIT World Peace University', 'DY Patil College'][getRandomInt(0, 4)];
          appData.previousCollegeAddress = ['Pune, Maharashtra', 'Mumbai, Maharashtra', 'Kolhapur, Maharashtra', 'Satara, Maharashtra'][getRandomInt(0, 3)];
          // Pick a deterministic previousCategory: even index → computing, odd index → non-computing
          {
            const allCats = await Category.find().lean();
            const cat1Id = cat1._id?.toString() || cat1?.toString();
            const computingCats = allCats.filter((c: any) => c.domain === 'computing' && c._id.toString() !== cat1Id);
            const nonComputingCats = allCats.filter((c: any) => c.domain !== 'computing' && c._id.toString() !== cat1Id);
            const useComputing = i % 2 === 0;
            const pool = useComputing ? computingCats : nonComputingCats;
            const chosen = pool.length > 0 ? pool[getRandomInt(0, pool.length - 1)] : allCats[0];
            appData.previousCategory = chosen._id;
          }
          appData.documents.push(
            {
              type: 'first_year_marksheet',
              url: 'https://res.cloudinary.com/sample/first_year_ms.pdf',
              publicId: 'sample_fy_ms',
              uploadedAt: new Date(),
            },
            {
              type: 'previous_college_bonafide',
              url: 'https://res.cloudinary.com/sample/bonafide.pdf',
              publicId: 'sample_bonafide',
              uploadedAt: new Date(),
            },
            {
              type: 'leaving_certificate',
              url: 'https://res.cloudinary.com/sample/leaving_cert.pdf',
              publicId: 'sample_leaving',
              uploadedAt: new Date(),
            }
          );
          break;

        case 'COLLEGE_TRANSFER':
          appData.tenthMarks = getRandomInt(60, 90);
          appData.twelfthMarks = getRandomInt(55, 88);
          appData.transferType = 'TRANSFER';
          appData.previousCollegeName = ['Pune Institute of Technology', 'Mumbai University', 'Bharti Vidyapeeth', 'MIT World Peace University', 'DY Patil College'][getRandomInt(0, 4)];
          appData.previousCollegeAddress = ['Pune, Maharashtra', 'Mumbai, Maharashtra', 'Kolhapur, Maharashtra', 'Satara, Maharashtra'][getRandomInt(0, 3)];
          appData.documents.push(
            {
              type: 'twelfth_marksheet',
              url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf',
              publicId: 'sample_twelfth',
              uploadedAt: new Date(),
            },
            {
              type: 'previous_college_bonafide',
              url: 'https://res.cloudinary.com/sample/bonafide.pdf',
              publicId: 'sample_bonafide',
              uploadedAt: new Date(),
            },
            {
              type: 'previous_year_marksheet',
              url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf',
              publicId: 'sample_prev_ms',
              uploadedAt: new Date(),
            },
            {
              type: 'transfer_certificate',
              url: 'https://res.cloudinary.com/sample/transfer_cert.pdf',
              publicId: 'sample_transfer',
              uploadedAt: new Date(),
            },
            {
              type: 'leaving_certificate',
              url: 'https://res.cloudinary.com/sample/leaving_cert.pdf',
              publicId: 'sample_leaving',
              uploadedAt: new Date(),
            }
          );
          break;

        case 'BRANCH_CHANGE':
          appData.tenthMarks = getRandomInt(65, 92);
          appData.twelfthMarks = getRandomInt(60, 90);
          appData.cetScore = getRandomInt(90, 175);
          appData.transferType = 'BRANCH_CHANGE';
          appData.previousCollegeName = 'Sandip University'; // same college
          appData.previousCollegeAddress = 'Nashik, Maharashtra';
          appData.documents.push(
            {
              type: 'twelfth_marksheet',
              url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf',
              publicId: 'sample_twelfth',
              uploadedAt: new Date(),
            },
            {
              type: 'previous_year_marksheet',
              url: 'https://res.cloudinary.com/sample/prev_year_ms.pdf',
              publicId: 'sample_prev_ms',
              uploadedAt: new Date(),
            },
            {
              type: 'fee_receipt',
              url: 'https://res.cloudinary.com/sample/fee_receipt.pdf',
              publicId: 'sample_fee',
              uploadedAt: new Date(),
            }
          );
          break;
      }

      // Submitted at
      if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'MERIT_LIST'].includes(status)) {
        appData.submittedAt = new Date(Date.now() - getRandomInt(2, 10) * 24 * 60 * 60 * 1000);
      }

      await Application.create(appData);
      applicationsCreated++;
      console.log(`  ✅ [${cfg.admissionType}] ${email} → ${course1.name}${cfg.hasSecondary ? ` + ${course2?.name}` : ''} (${status})`);
    }

    // Update allocatedSeats on courses based on application allocations
    console.log('\n📊 Updating course allocatedSeats...');
    const allocations = await Application.aggregate([
      { $match: { allocatedCourse: { $ne: null } } },
      { $group: { _id: '$allocatedCourse', count: { $sum: 1 } } },
    ]);
    for (const alloc of allocations) {
      await Course.findByIdAndUpdate(alloc._id, { allocatedSeats: alloc.count });
    }
    console.log(`   ✅ Updated allocatedSeats for ${allocations.length} courses`);

    // ── Sample EFY → DSE FE transfer student ──
    console.log('\n🔄 Creating sample EFY→DSE FE transfer student...');
    {
      const efyEmail = 'student.efy2dse.demo@test.com';
      let transferUser = await User.findOne({ email: efyEmail });
      if (!transferUser) {
        transferUser = await User.create({
          email: efyEmail,
          mobile: '9876599999',
          password: 'Test@123',
          firstName: 'Demo',
          lastName: 'Transfer',
          role: studentRole._id,
          isActive: true,
        });
      }

      // Step 1: Confirmed EFY application
      const efyCourse = courses[0] as any;
      const existingEfy = await Application.findOne({ user: transferUser._id, admissionType: 'ENGINEERING_FIRST_YEAR' });
      if (!existingEfy) {
        await Application.create({
          applicationId: 'ENG-2026-000100',
          user: transferUser._id,
          name: 'Demo Transfer',
          email: efyEmail,
          address: '123, MG Road, Pune 411001',
          admissionType: 'ENGINEERING_FIRST_YEAR',
          category: efyCourse.category._id || efyCourse.category,
          primaryCourse: efyCourse._id,
          tenthMarks: 88,
          twelfthMarks: 82,
          cetScore: 145,
          status: 'ADMISSION_CONFIRMED',
          statusHistory: [
            { status: 'DRAFT', changedAt: new Date(Date.now() - 35 * 86400000) },
            { status: 'SUBMITTED', changedAt: new Date(Date.now() - 30 * 86400000) },
            { status: 'UNDER_REVIEW', changedAt: new Date(Date.now() - 25 * 86400000) },
            { status: 'VERIFIED', changedAt: new Date(Date.now() - 20 * 86400000) },
            { status: 'MERIT_LIST', changedAt: new Date(Date.now() - 15 * 86400000) },
            { status: 'SEAT_ALLOCATED', changedAt: new Date(Date.now() - 10 * 86400000) },
            { status: 'FEE_PAID', changedAt: new Date(Date.now() - 5 * 86400000) },
            { status: 'ADMISSION_CONFIRMED', changedAt: new Date(Date.now() - 2 * 86400000) },
          ],
          allocatedCourse: efyCourse._id,
          isActive: true,
          documents: [
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
            { type: 'photo', url: 'https://res.cloudinary.com/sample/photo.jpg', publicId: 'sample_photo', uploadedAt: new Date() },
            { type: 'aadhaar_card', url: 'https://res.cloudinary.com/sample/aadhaar.pdf', publicId: 'sample_aadhaar', uploadedAt: new Date() },
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'cet_result', url: 'https://res.cloudinary.com/sample/cet_result.pdf', publicId: 'sample_cet', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          ],
          submittedAt: new Date(Date.now() - 30 * 86400000),
          meritRank: 15,
          createdBy: transferUser._id,
          updatedBy: transferUser._id,
        });
        console.log('   ✅ EFY application (ADMISSION_CONFIRMED)');
      } else {
        console.log('   ⏭️ EFY application already exists');
      }

      // Step 2: DSE FE application with previousCategory from EFY
      const dfeCourses = courses.filter((c: any) => {
        const cId = c.category._id || c.category;
        const efyCatId = efyCourse.category._id || efyCourse.category;
        return cId.toString() !== efyCatId.toString();
      });
      const dfeCourse1 = dfeCourses[0] || courses[1];
      const dfeCat1 = dfeCourse1.category;

      const existingDse = await Application.findOne({ user: transferUser._id, admissionType: 'DIRECT_SECOND_YEAR_FE' });
      if (!existingDse) {
        await Application.create({
          applicationId: 'DSF-2026-000101',
          user: transferUser._id,
          name: 'Demo Transfer',
          email: efyEmail,
          address: '123, MG Road, Pune 411001',
          admissionType: 'DIRECT_SECOND_YEAR_FE',
          category: dfeCat1._id || dfeCat1,
          primaryCourse: dfeCourse1._id,
          previousCategory: efyCourse.category._id || efyCourse.category,
          previousCollegeName: 'Pune Institute of Technology',
          previousCollegeAddress: 'Pune, Maharashtra',
          tenthMarks: 88,
          twelfthMarks: 82,
          cetScore: 145,
          status: 'VERIFIED',
          statusHistory: [
            { status: 'DRAFT', changedAt: new Date(Date.now() - 10 * 86400000) },
            { status: 'SUBMITTED', changedAt: new Date(Date.now() - 8 * 86400000) },
            { status: 'UNDER_REVIEW', changedAt: new Date(Date.now() - 5 * 86400000) },
            { status: 'VERIFIED', changedAt: new Date(Date.now() - 2 * 86400000) },
          ],
          isActive: true,
          documents: [
            { type: 'tenth_marksheet', url: 'https://res.cloudinary.com/sample/tenth_marksheet.pdf', publicId: 'sample_tenth', uploadedAt: new Date() },
            { type: 'photo', url: 'https://res.cloudinary.com/sample/photo.jpg', publicId: 'sample_photo', uploadedAt: new Date() },
            { type: 'aadhaar_card', url: 'https://res.cloudinary.com/sample/aadhaar.pdf', publicId: 'sample_aadhaar', uploadedAt: new Date() },
            { type: 'first_year_marksheet', url: 'https://res.cloudinary.com/sample/first_year_ms.pdf', publicId: 'sample_fy_ms', uploadedAt: new Date() },
            { type: 'previous_college_bonafide', url: 'https://res.cloudinary.com/sample/bonafide.pdf', publicId: 'sample_bonafide', uploadedAt: new Date() },
            { type: 'twelfth_marksheet', url: 'https://res.cloudinary.com/sample/twelfth_marksheet.pdf', publicId: 'sample_twelfth', uploadedAt: new Date() },
            { type: 'leaving_certificate', url: 'https://res.cloudinary.com/sample/leaving_cert.pdf', publicId: 'sample_leaving', uploadedAt: new Date() },
          ],
          submittedAt: new Date(Date.now() - 8 * 86400000),
          meritRank: 22,
          createdBy: transferUser._id,
          updatedBy: transferUser._id,
        });
        console.log('   ✅ DSE FE application (VERIFIED, previousCategory from EFY)');
      } else {
        console.log('   ⏭️ DSE FE application already exists');
      }
      applicationsCreated += 2;
    }

    // Re-count allocatedSeats with the new data
    {
      const reAllocations = await Application.aggregate([
        { $match: { allocatedCourse: { $ne: null } } },
        { $group: { _id: '$allocatedCourse', count: { $sum: 1 } } },
      ]);
      for (const alloc of reAllocations) {
        await Course.findByIdAndUpdate(alloc._id, { allocatedSeats: alloc.count });
      }
    }

    console.log(`\n✅ Created ${applicationsCreated} student applications across all admission types`);
    console.log('\n📋 Test Credentials (password: Test@123):');
    for (const cfg of configs) {
      console.log(`  student.${cfg.admissionType.toLowerCase()}.${cfg.suffix}@test.com`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedStudentApplications();
