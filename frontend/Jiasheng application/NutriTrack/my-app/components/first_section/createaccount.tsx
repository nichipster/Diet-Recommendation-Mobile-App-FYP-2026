import React from 'react';
import useCreateAccountConsts from './codes/createaccountconsts';
import CreateAccountCode from './codes/createaccountcode';

export default function CreateAccount() {
  const logic = useCreateAccountConsts();
  return <CreateAccountCode {...logic} />;
}