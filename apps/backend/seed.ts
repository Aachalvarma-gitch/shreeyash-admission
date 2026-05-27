import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.model.js';
import Course from './models/Course.model.js';
import Role from './models/Role.model.js';
import User from './models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shreeyas-db';

const categories = [
  { name: 'Computer Science', slug: 'computer-science', domain: 'computing', description: 'Computer Science programs', displayOrder: 1 },
  { name: 'Information Technology', slug: 'information-technology', domain: 'computing', description: 'Information Technology programs', displayOrder: 2 },
  { name: 'AI / ML', slug: 'ai-ml', domain: 'computing', description: 'Artificial Intelligence & Machine Learning programs', displayOrder: 3 },
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

const courses = [
  // Computer Science
  { name: 'BCA', code: 'CS-BCA', categorySlug: 'computer-science', duration: 3, fees: 85000, seats: 120 },
  { name: 'MCA', code: 'CS-MCA', categorySlug: 'computer-science', duration: 2, fees: 120000, seats: 60 },
  { name: 'BCS', code: 'CS-BCS', categorySlug: 'computer-science', duration: 3, fees: 75000, seats: 90 },
  { name: 'MSc Computer Science', code: 'CS-MSC', categorySlug: 'computer-science', duration: 2, fees: 110000, seats: 45 },

  // Information Technology
  { name: 'BSc IT', code: 'IT-BSC', categorySlug: 'information-technology', duration: 3, fees: 80000, seats: 90 },
  { name: 'MSc IT', code: 'IT-MSC', categorySlug: 'information-technology', duration: 2, fees: 105000, seats: 45 },

  // AI / ML
  { name: 'BSc AI/ML', code: 'AI-BSC', categorySlug: 'ai-ml', duration: 3, fees: 95000, seats: 60 },
  { name: 'MSc AI/ML', code: 'AI-MSC', categorySlug: 'ai-ml', duration: 2, fees: 130000, seats: 30 },

  // Mechanical Engineering
  { name: 'Diploma Mechanical', code: 'ME-DIP', categorySlug: 'mechanical-engineering', duration: 3, fees: 45000, seats: 120 },
  { name: 'BE Mechanical', code: 'ME-BE', categorySlug: 'mechanical-engineering', duration: 4, fees: 95000, seats: 60 },
  { name: 'ME Mechanical', code: 'ME-ME', categorySlug: 'mechanical-engineering', duration: 2, fees: 110000, seats: 30 },

  // Civil Engineering
  { name: 'Diploma Civil', code: 'CV-DIP', categorySlug: 'civil-engineering', duration: 3, fees: 40000, seats: 120 },
  { name: 'BE Civil', code: 'CV-BE', categorySlug: 'civil-engineering', duration: 4, fees: 85000, seats: 60 },
  { name: 'ME Civil', code: 'CV-ME', categorySlug: 'civil-engineering', duration: 2, fees: 100000, seats: 30 },

  // Electrical Engineering
  { name: 'Diploma Electrical', code: 'EE-DIP', categorySlug: 'electrical-engineering', duration: 3, fees: 42000, seats: 90 },
  { name: 'BE Electrical', code: 'EE-BE', categorySlug: 'electrical-engineering', duration: 4, fees: 90000, seats: 60 },
  { name: 'ME Electrical', code: 'EE-ME', categorySlug: 'electrical-engineering', duration: 2, fees: 105000, seats: 30 },

  // Electronics Engineering
  { name: 'Diploma Electronics', code: 'EC-DIP', categorySlug: 'electronics-engineering', duration: 3, fees: 42000, seats: 90 },
  { name: 'BE Electronics', code: 'EC-BE', categorySlug: 'electronics-engineering', duration: 4, fees: 90000, seats: 60 },
  { name: 'ME Electronics', code: 'EC-ME', categorySlug: 'electronics-engineering', duration: 2, fees: 105000, seats: 30 },

  // Commerce
  { name: 'BCom', code: 'CM-BCOM', categorySlug: 'commerce', duration: 3, fees: 35000, seats: 120 },
  { name: 'MCom', code: 'CM-MCOM', categorySlug: 'commerce', duration: 2, fees: 55000, seats: 60 },
  { name: 'BBA', code: 'CM-BBA', categorySlug: 'commerce', duration: 3, fees: 65000, seats: 90 },
  { name: 'MBA', code: 'CM-MBA', categorySlug: 'commerce', duration: 2, fees: 150000, seats: 45 },

  // Arts
  { name: 'BA', code: 'AR-BA', categorySlug: 'arts', duration: 3, fees: 25000, seats: 150 },
  { name: 'MA', code: 'AR-MA', categorySlug: 'arts', duration: 2, fees: 40000, seats: 60 },
  { name: 'BSc', code: 'AR-BSC', categorySlug: 'arts', duration: 3, fees: 30000, seats: 90 },
  { name: 'MSW', code: 'AR-MSW', categorySlug: 'arts', duration: 2, fees: 45000, seats: 45 },

  // Data Science
  { name: 'BSc Data Science', code: 'DS-BSC', categorySlug: 'data-science', duration: 3, fees: 95000, seats: 60 },
  { name: 'MSc Data Science', code: 'DS-MSC', categorySlug: 'data-science', duration: 2, fees: 130000, seats: 30 },
  { name: 'PG Diploma Data Science', code: 'DS-PGD', categorySlug: 'data-science', duration: 1, fees: 75000, seats: 40 },

  // Cyber Security
  { name: 'BSc Cyber Security', code: 'CY-BSC', categorySlug: 'cyber-security', duration: 3, fees: 90000, seats: 60 },
  { name: 'MSc Cyber Security', code: 'CY-MSC', categorySlug: 'cyber-security', duration: 2, fees: 125000, seats: 30 },
  { name: 'PG Diploma Cyber Security', code: 'CY-PGD', categorySlug: 'cyber-security', duration: 1, fees: 70000, seats: 40 },

  // Pharmacy
  { name: 'Diploma Pharmacy', code: 'PH-DIP', categorySlug: 'pharmacy', duration: 2, fees: 50000, seats: 60 },
  { name: 'BPharm', code: 'PH-BPH', categorySlug: 'pharmacy', duration: 4, fees: 110000, seats: 100 },
  { name: 'MPharm', code: 'PH-MPH', categorySlug: 'pharmacy', duration: 2, fees: 150000, seats: 45 },
  { name: 'PharmD', code: 'PH-DOC', categorySlug: 'pharmacy', duration: 6, fees: 200000, seats: 30 },

  // Management Studies
  { name: 'BBA', code: 'MG-BBA', categorySlug: 'management-studies', duration: 3, fees: 75000, seats: 90 },
  { name: 'MBA', code: 'MG-MBA', categorySlug: 'management-studies', duration: 2, fees: 180000, seats: 60 },
  { name: 'BMS', code: 'MG-BMS', categorySlug: 'management-studies', duration: 3, fees: 70000, seats: 60 },
  { name: 'PGDM', code: 'MG-PGD', categorySlug: 'management-studies', duration: 2, fees: 160000, seats: 45 },

  // Science
  { name: 'BSc General', code: 'SC-BSC', categorySlug: 'science', duration: 3, fees: 35000, seats: 120 },
  { name: 'MSc General', code: 'SC-MSC', categorySlug: 'science', duration: 2, fees: 55000, seats: 60 },
  { name: 'BSc Biotechnology', code: 'SC-BBT', categorySlug: 'science', duration: 3, fees: 65000, seats: 60 },
  { name: 'MSc Biotechnology', code: 'SC-MBT', categorySlug: 'science', duration: 2, fees: 95000, seats: 30 },
];

const roles = [
  { name: 'Student', description: 'Student applicant', permissions: [] },
  { name: 'Admin', description: 'Admin staff member', permissions: [] },
  { name: 'Super Admin', description: 'Super administrator', permissions: [] },
];

const adminUsers = [
  {
    email: 'admin@sycet.org',
    mobile: '9876543210',
    password: 'Admin@123',
    firstName: 'System',
    lastName: 'Admin',
    roleName: 'Admin',
  },
  {
    email: 'superadmin@sycet.org',
    mobile: '9876543211',
    password: 'SuperAdmin@123',
    firstName: 'Super',
    lastName: 'Admin',
    roleName: 'Super Admin',
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create roles
    for (const role of roles) {
      const existing = await Role.findOne({ name: role.name });
      if (!existing) {
        await Role.create(role);
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    // Create admin users
    for (const admin of adminUsers) {
      const existingUser = await User.findOne({ email: admin.email });
      if (!existingUser) {
        const role = await Role.findOne({ name: admin.roleName });
        if (role) {
          await User.create({
            email: admin.email,
            mobile: admin.mobile,
            password: admin.password,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: role._id,
            isActive: true,
          });
          console.log(`Created admin user: ${admin.email} with password: ${admin.password}`);
        }
      } else {
        console.log(`Admin user already exists: ${admin.email}`);
      }
    }

    // Replace categories (drop old, create new)
    await Category.deleteMany({});
    console.log('Cleared old categories');

    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    for (const cat of categories) {
      const created = await Category.create(cat);
      categoryMap.set(cat.slug, created._id);
      console.log(`Created category: ${cat.name} [domain: ${cat.domain}]`);
    }

    // Replace courses (drop old, create new)
    await Course.deleteMany({});
    console.log('Cleared old courses');

    for (const course of courses) {
      const categoryId = categoryMap.get(course.categorySlug);
      if (categoryId) {
        await Course.create({
          name: course.name,
          code: course.code,
          category: categoryId,
          duration: course.duration,
          fees: course.fees,
          seats: course.seats,
        });
        console.log(`Created course: ${course.name} (${course.code})`);
      }
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log('   Super Admin: superadmin@sycet.org / SuperAdmin@123');
    console.log('   Admin:      admin@sycet.org / Admin@123');
    console.log('\n📚 Categories created:');
    categories.forEach((c) => console.log(`   ${c.name} → domain: ${c.domain}`));
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
