'use client';

import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_u2c4NVWFd',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '5fhkbffpsrjmi930udh68jtpg8',
    },
  },
});
