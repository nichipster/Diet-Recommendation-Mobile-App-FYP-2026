export const DUMMY_USERS = [
  {
    user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    hashed_password: 'password123',
    role: 'freemium',
    premium_start: null,
    premium_end: null,
    suspended: false,
    gender: 'Male',
    age: '28',
    height: '175',
    weight: '70',
    goal: 'Maintain',
    goalWeight: '70',
    activityLevel: 'Lightly Active',
    cardioPerWeek: '3×',
    isVegan: false,
    allergies: [],
  },
  {
    user_id: 2,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    hashed_password: 'password123',
    role: 'admin',
    premium_start: null,
    premium_end: null,
    suspended: false,
    gender: 'Female',
    age: '25',
    height: '163',
    weight: '58',
    goal: 'Lose',
    goalWeight: '53',
    activityLevel: 'Active',
    cardioPerWeek: '5×',
    isVegan: true,
    allergies: ['Milk', 'Egg'],
  },
  {
    user_id: 3,
    first_name: 'Alex',
    last_name: 'Tan',
    email: 'alex@example.com',
    hashed_password: 'password123',
    role: 'premium',
    premium_start: '2026-01-01',
    premium_end: '2027-01-01',
    suspended: false,
    gender: 'Male',
    age: '30',
    height: '178',
    weight: '75',
    goal: 'Gain',
    goalWeight: '80',
    activityLevel: 'Active',
    cardioPerWeek: '4×',
    isVegan: false,
    allergies: [],
  },
];

export let VERIFICATION_CODES: Record<string, string> = {};

export const generateVerificationCode = (email: string): string => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  VERIFICATION_CODES[email] = code;
  console.log(`Verification code for ${email}: ${code}`);
  return code;
};

export const verifyCode = (email: string, code: string): boolean => {
  return VERIFICATION_CODES[email] === code;
};

export const getVerificationCode = (email: string): string | undefined => {
  return VERIFICATION_CODES[email];
};