import fs from 'fs';
import path from 'path';

// Indian States and Union Territories
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep'
];

// Sample districts by state (you can expand this with complete data)
export const STATE_DISTRICTS: Record<string, string[]> = {
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
    'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban',
    'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar',
    'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
    'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ],
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
    'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
    'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kutch', 'Kheda',
    'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
    'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
    'Tapi', 'Vadodara', 'Valsad'
  ],
  'Karnataka': [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar',
    'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada',
    'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu',
    'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
    'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner',
    'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh',
    'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli',
    'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar',
    'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'
  ],
  // Add more states as needed
};

// Sample talukas by district (simplified - you can expand this)
export const DISTRICT_TALUKAS: Record<string, Record<string, string[]>> = {
  'Maharashtra': {
    'Pune': ['Pune City', 'Haveli', 'Khed', 'Junnar', 'Ambegaon', 'Maval', 'Mulshi', 'Shirur', 'Purandar', 'Velhe', 'Bhor', 'Baramati', 'Indapur', 'Daund'],
    'Mumbai City': ['Andheri', 'Bandra', 'Borivali', 'Chembur', 'Dahisar', 'Ghatkopar', 'Goregaon', 'Kandivali', 'Kurla', 'Malad', 'Matunga', 'Mira Bhayandar', 'Mulund', 'Powai', 'Santacruz', 'Thane', 'Ulhasnagar', 'Vasai-Virar'],
    'Nagpur': ['Nagpur', 'Kamptee', 'Hingna', 'Parseoni', 'Ramtek', 'Mauda', 'Kalameshwar', 'Saoner', 'Savner'],
    'Thane': ['Thane', 'Kalyan', 'Ulhasnagar', 'Ambarnath', 'Bhiwandi', 'Shahapur', 'Murbad', 'Vada', 'Palghar'],
    // Add more districts
  },
  'Gujarat': {
    'Ahmedabad': ['Ahmedabad City', 'Daskroi', 'Sanand', 'Viramgam', 'Detroj-Rampura', 'Mandal', 'Dhandhuka'],
    'Surat': ['Surat City', 'Choryasi', 'Kamrej', 'Olpad', 'Mangrol', 'Umarpada', 'Bardoli', 'Mahuva', 'Mandvi'],
    // Add more districts
  },
  'Karnataka': {
    'Bengaluru Urban': ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Bengaluru West', 'Anekal', 'Hosakote'],
    // Add more districts
  },
  // Add more states
};

export class LocationService {
  static getStates(): string[] {
    return INDIAN_STATES;
  }

  static getDistrictsByState(state: string): string[] {
    return STATE_DISTRICTS[state] || [];
  }

  static getTalukasByDistrict(state: string, district: string): string[] {
    return DISTRICT_TALUKAS[state]?.[district] || [];
  }

  static validateLocation(state: string, district: string, taluka: string): boolean {
    const districts = this.getDistrictsByState(state);
    if (!districts.includes(district)) return false;

    const talukas = this.getTalukasByDistrict(state, district);
    return talukas.includes(taluka);
  }

  static getAllLocations(): {
    states: string[];
    districts: Record<string, string[]>;
    talukas: Record<string, Record<string, string[]>>;
  } {
    return {
      states: INDIAN_STATES,
      districts: STATE_DISTRICTS,
      talukas: DISTRICT_TALUKAS,
    };
  }
}
