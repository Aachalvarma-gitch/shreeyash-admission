import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdmissionType from './models/AdmissionType.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shreeyas-db';

const admissionTypes = [
  {
    name: 'Polytechnic',
    slug: 'polytechnic',
    description: 'Admission to Polytechnic diploma programs after 10th',
    requiredDocuments: ['tenth_marksheet', 'leaving_certificate'],
    optionalDocuments: ['photo', 'aadhaar_card'],
    fee: 500,
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Engineering First Year',
    slug: 'engineering_first_year',
    description: 'Admission to First Year Engineering after 12th (HSC)',
    requiredDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'leaving_certificate'],
    optionalDocuments: ['photo', 'aadhaar_card'],
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
    requiredDocuments: ['diploma_marksheet', 'diploma_certificate', 'migration_certificate'],
    optionalDocuments: ['tenth_marksheet', 'photo', 'aadhaar_card', 'leaving_certificate'],
    fee: 0,
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'Direct Second Year (After First Year)',
    slug: 'direct_second_year_fe',
    description: 'Direct admission to Second Year Engineering after completing First Year Engineering',
    requiredDocuments: ['first_year_marksheet', 'previous_college_bonafide', 'leaving_certificate'],
    optionalDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'cet_result', 'photo', 'aadhaar_card'],
    fee: 0,
    displayOrder: 5,
    isActive: true,
  },
  {
    name: 'College Transfer',
    slug: 'college_transfer',
    description: 'Transfer from another college/institution',
    requiredDocuments: ['previous_college_bonafide', 'previous_year_marksheet', 'transfer_certificate'],
    optionalDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'photo', 'aadhaar_card', 'leaving_certificate'],
    fee: 500,
    displayOrder: 6,
    isActive: true,
  },
  {
    name: 'Branch Change',
    slug: 'branch_change',
    description: 'Change of branch within the same college',
    requiredDocuments: ['previous_year_marksheet', 'fee_receipt'],
    optionalDocuments: ['tenth_marksheet', 'twelfth_marksheet', 'photo', 'aadhaar_card'],
    fee: 500,
    displayOrder: 7,
    isActive: true,
  },
];

async function seedAdmissionSystem() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const at of admissionTypes) {
      const existing = await AdmissionType.findOne({ slug: at.slug });
      if (!existing) {
        await AdmissionType.create(at);
        console.log(`Created admission type: ${at.name}`);
      } else {
        console.log(`Admission type already exists: ${at.name}`);
      }
    }

    console.log('\n✅ Admission system seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedAdmissionSystem();
