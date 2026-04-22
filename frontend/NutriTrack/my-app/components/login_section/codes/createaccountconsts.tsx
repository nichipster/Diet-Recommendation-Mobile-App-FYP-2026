import { router } from 'expo-router';
import { useState } from 'react';
import { useUser } from '../../../context/UserContext';
import { API_URL } from '../../../constants/api';

export default function CreateAccountConsts() {
  const { setUser } = useUser();

  // ← User info
  const [role, setRole] = useState<'user' | 'nutritionist'>('user');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ← Nutritionist info
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialisations, setSpecialisations] = useState<string[]>([]); 
  const [otherSpecialisation, setOtherSpecialisation] = useState('');
  const [institution, setInstitution] = useState('');

  // ← Errors
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  const [licenseNumberError, setLicenseNumberError] = useState('');
  const [specialisationError, setSpecialisationError] = useState('');
  const [otherSpecialisationError, setOtherSpecialisationError] = useState('');
  const [institutionError, setInstitutionError] = useState('');

  const nameRegex = /^[a-zA-Z\s'-]+$/;

  const validateName = (value: string, field: 'first' | 'last') => {
    if (!nameRegex.test(value) && value.length > 0) {
      const error = 'Name cannot contain numbers or special characters';
      field === 'first' ? setFirstNameError(error) : setLastNameError(error);
    } else {
      field === 'first' ? setFirstNameError('') : setLastNameError('');
    }
  };

  const validatePassword = (value: string) => {
    if (value.length < 8 && value.length > 0) {
      setPasswordError('Password must be at least 8 characters');
    } else {
      setPasswordError('');
    }
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.includes('@') || !value.endsWith('.com')) {
      setEmailError('Please enter a valid email address');
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async () => {
    let hasError = false;

    // ← Name validation
    if (firstName.length === 0) {
      setFirstNameError('First name is required');
      hasError = true;
    } else if (!nameRegex.test(firstName)) {
      setFirstNameError('Invalid name');
      hasError = true;
    } else setFirstNameError('');

    if (lastName.length === 0) {
      setLastNameError('Last name is required');
      hasError = true;
    } else if (!nameRegex.test(lastName)) {
      setLastNameError('Invalid name');
      hasError = true;
    } else setLastNameError('');

    // ← Email & password
    if (!email.includes('@') || !email.endsWith('.com')) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else setEmailError('');

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    } else setPasswordError('');

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    } else setConfirmPasswordError('');

    // ← Terms
    if (!agreed) {
      setTermsError('You must agree to the Terms of Service');
      hasError = true;
    } else setTermsError('');

    // ← Nutritionist validation
    if (role === 'nutritionist') {
      if (!licenseNumber) {
        setLicenseNumberError('License number is required');
        hasError = true;
      } else setLicenseNumberError('');

      if (specialisations.length === 0) {
        setSpecialisationError('At least one specialisation is required');
        hasError = true;
      } else setSpecialisationError('');

      if (!institution) {
        setInstitutionError('Institution is required');
        hasError = true;
      } else setInstitutionError('');
    }

    // ← "Others" validation
    if (
      specialisations.includes('others') &&
      !otherSpecialisation.trim()
    ) {
      setOtherSpecialisationError('Specialisation is required');
      hasError = true;
    } else {
      setOtherSpecialisationError('');
    }

    if (!hasError) {
  try {
    let finalSpecialisations = [...specialisations];

    if (specialisations.includes('others')) {
      finalSpecialisations = finalSpecialisations.filter((s) => s !== 'others');
      if (otherSpecialisation.trim()) {
        finalSpecialisations.push(otherSpecialisation.trim());
      }
    }

    // ← Create account
    const response = await fetch(`${API_URL}/auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
      }),
    });

    const data = await response.json();
    console.log('Register status:', response.status, data);

    if (!response.ok) {
      if (response.status === 409) {
        setEmailError('This email is already in use');
      } else {
        setEmailError(data.detail || 'Something went wrong');
      }
      return;
    }

    // ← No token call here — user isn't verified yet
    // ← No generateVerificationCode — backend already sent the real code

    setUser({
      firstName,
      lastName,
      email,
      token: '',
      role,
      gender: '',
      dob: '',
      height: '',
      weight: '',
      goal: '',
      goalWeight: '',
      activityLevel: '',
      cardioPerWeek: '',
      isVegan: false,
      isVegetarian: false,
      isHalal: false,
      isGlutenFree: false,
      hasPeanutAllergy: false,
      hasTreeNutAllergy: false,
      hasMilkAllergy: false,
      hasEggAllergy: false,
      hasFishAllergy: false,
      hasShellfishAllergy: false,
      hasSoyAllergy: false,
      hasWheatAllergy: false,
      hasSesameAllergy: false,
      hasSulfiteAllergy: false,
      allergyNotes: '',
      tdee: '',
    });

    // ← Pass email + password so verifycode can log in after verification
    router.replace({
      pathname: '/verify',
      params: { email, password, next: 'survey' },
    } as any);

  } catch (e) {
    setEmailError('Network error. Please try again.');
  }
}
  };

  return {
    role, setRole,
    firstName, lastName, email, password, confirmPassword, agreed,

    licenseNumber,
    specialisations, 
    otherSpecialisation,
    institution,

    firstNameError, lastNameError, emailError, passwordError,
    confirmPasswordError, termsError,

    licenseNumberError, specialisationError,
    otherSpecialisationError, institutionError,

    setFirstName, setLastName, setEmail, setPassword,
    setConfirmPassword, setAgreed,

    setLicenseNumber,
    setSpecialisations, 
    setOtherSpecialisation,
    setInstitution,

    setFirstNameError, setLastNameError, setEmailError,
    setPasswordError, setConfirmPasswordError, setTermsError,

    setLicenseNumberError, setSpecialisationError,
    setOtherSpecialisationError, setInstitutionError,

    validateName, validateEmail, validatePassword,
    handleSubmit,
  };
}