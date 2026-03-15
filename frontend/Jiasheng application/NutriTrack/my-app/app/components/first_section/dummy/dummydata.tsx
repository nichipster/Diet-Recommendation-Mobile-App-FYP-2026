export const DUMMY_USERS = [
  {
    user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    hashed_password: 'password123',
    role: 'user',
    premium_start: null,
    premium_end: null,
    suspended: false,
    // health data
    gender: 'Male',
    age: '28',
    height: '175',
    weight: '70',
    goal: 'Maintain',
    goalWeight: '70',
    activityLevel: 'Lightly Active',
    cardioPerWeek: '3×',
    // dietary
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
];


// fake 6-digit code store (in real app this would be server-side)
export let VERIFICATION_CODES: Record<string, string> = {};

export const generateVerificationCode = (email: string): string => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  VERIFICATION_CODES[email] = code;
  console.log(`Verification code for ${email}: ${code}`); // shows in terminal for testing
  return code;
};

export const verifyCode = (email: string, code: string): boolean => {
  return VERIFICATION_CODES[email] === code;
};