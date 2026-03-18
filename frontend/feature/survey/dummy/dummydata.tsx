export const DUMMY_USERS = [
  {
    user_id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    hashed_password: 'password123',
    phone_number: null,
    role: 'user',
    premium_start: null,
    premium_end: null,
    suspended: false,
  },
  {
    user_id: 2,
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    hashed_password: 'password123',
    phone_number: null,
    role: 'admin',
    premium_start: null,
    premium_end: null,
    suspended: false,
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