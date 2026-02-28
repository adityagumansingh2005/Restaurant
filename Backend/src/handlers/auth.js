/**
 * ✅ Authentication Handlers - AWS Cognito Integration with OTP
 * OTP-based signup and Login endpoints using AWS Cognito User Pool
 */

const crypto = require('crypto');
const CognitoIdentityServiceProvider = require('aws-sdk/clients/cognitoidentityserviceprovider');
const AWS = require('aws-sdk');

const cognito = new CognitoIdentityServiceProvider({
  region: process.env.COGNITO_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.COGNITO_REGION || 'us-east-1',
});

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;
const clientSecret = process.env.COGNITO_CLIENT_SECRET || null;
const USERS_TABLE = process.env.USERS_TABLE || 'restaurant-api-users-dev';

// ✅ Helper: Compute SECRET_HASH for Cognito (if client secret exists)
const computeSecretHash = (username) => {
  if (!clientSecret) return null;
  
  return crypto
    .createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
};

// ✅ Helper: Build auth params with optional SECRET_HASH
const buildAuthParams = (username, password) => {
  const params = {
    USERNAME: username,
    PASSWORD: password,
  };
  const secretHash = computeSecretHash(username);
  if (secretHash) {
    params.SECRET_HASH = secretHash;
  }
  return params;
};

// Helper function to format response
const formatResponse = (statusCode, success, message, data = null) => {
  return {
    statusCode,
    body: JSON.stringify({
      success,
      message,
      ...(data && { data }),
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  };
};

/**
 * ✅ Signup Handler - Register new user in Cognito
 */
module.exports.signup = async (event) => {
  console.log('POST /auth/signup - User registration via Cognito');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password, firstName, lastName, phone } = body;

    // Validation
    if (!email || !password) {
      return formatResponse(400, false, 'Email and password are required');
    }

    if (password.length < 8) {
      return formatResponse(400, false, 'Password must be at least 8 characters');
    }

    // Sign up user in Cognito
    const userAttributes = [
      {
        Name: 'email',
        Value: email,
      },
      {
        Name: 'given_name',
        Value: firstName || 'User',
      },
      {
        Name: 'family_name',
        Value: lastName || '',
      },
      {
        Name: 'name',
        Value: `${firstName || 'User'} ${lastName || ''}`.trim(),
      },
      {
        Name: 'phone_number',
        Value: phone || '+1 (000) 000-0000',
      },
    ];

    const signupParams = {
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    };
    
    const secretHash = computeSecretHash(email);
    if (secretHash) {
      signupParams.SecretHash = secretHash;
    }

    const signupResult = await cognito.signUp(signupParams).promise();

    console.log('✅ User created in Cognito:', signupResult.UserSub);

    // Auto-confirm user (in production, you might want to send verification email)
    await cognito.adminConfirmSignUp({
      UserPoolId: userPoolId,
      Username: email,
    }).promise();

    console.log('✅ User confirmed in Cognito');

    // ✅ Store user data in DynamoDB
    const timestamp = new Date().toISOString();
    try {
      await dynamodb
        .put({
          TableName: USERS_TABLE,
          Item: {
            userId: signupResult.UserSub,
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '+1 (000) 000-0000',
            name: `${firstName || ''} ${lastName || ''}`.trim(),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        })
        .promise();
      console.log('✅ User stored in DynamoDB:', signupResult.UserSub);
    } catch (dbErr) {
      console.warn('⚠️ Failed to store user in DynamoDB:', dbErr.message || dbErr);
    }

    // After confirming, attempt to authenticate user to return tokens
    let tokens = null;
    try {
      const authParams = {
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: clientId,
        UserPoolId: userPoolId,
        AuthParameters: buildAuthParams(email, password),
      };

      const authRes = await cognito.adminInitiateAuth(authParams).promise();
      tokens = {
        accessToken: authRes.AuthenticationResult.AccessToken,
        idToken: authRes.AuthenticationResult.IdToken,
        refreshToken: authRes.AuthenticationResult.RefreshToken,
      };
    } catch (err) {
      console.warn('Could not auto-authenticate user after signup:', err.message || err);
    }

    return formatResponse(201, true, 'User registered successfully', {
      userId: signupResult.UserSub,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      tokens,
      token: tokens?.accessToken || null,
    });

  } catch (error) {
    console.error('Error in signup:', error);

    // Handle specific Cognito errors
    if (error.code === 'UsernameExistsException') {
      return formatResponse(409, false, 'Email already registered');
    }
    if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, false, error.message);
    }

    return formatResponse(500, false, error.message || 'Failed to register user');
  }
};

/**
 * ✅ Login Handler - Authenticate user with Cognito
 */
module.exports.login = async (event) => {
  console.log('POST /auth/login - User login via Cognito');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return formatResponse(400, false, 'Email and password are required');
    }

    // Authenticate with Cognito using admin auth flow
    const params = {
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      ClientId: clientId,
      UserPoolId: userPoolId,
      AuthParameters: buildAuthParams(email, password),
    };

    const authResult = await cognito.adminInitiateAuth(params).promise();

    console.log('✅ User authenticated successfully');

    // Get user details
    const userDetails = await cognito.adminGetUser({
      UserPoolId: userPoolId,
      Username: email,
    }).promise();

    // Extract user attributes
    const attributes = {};
    userDetails.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });

    return formatResponse(200, true, 'Login successful', {
      userId: userDetails.Username,
      email: attributes.email,
      firstName: attributes.given_name || '',
      lastName: attributes.family_name || '',
      phone: attributes.phone_number || '',
      tokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
      },
      token: authResult.AuthenticationResult.AccessToken,
    });

  } catch (error) {
    console.error('Error in login:', error);

    // Handle specific Cognito errors
    if (error.code === 'UserNotFoundException' || error.code === 'NotAuthorizedException') {
      return formatResponse(401, false, 'Invalid email or password');
    }
    if (error.code === 'UserNotConfirmedException') {
      return formatResponse(403, false, 'User email not confirmed');
    }

    return formatResponse(500, false, error.message || 'Failed to login');
  }
};

/**
 * ✅ Refresh Token Handler - Get new tokens using refresh token
 */
module.exports.refresh = async (event) => {
  console.log('POST /auth/refresh - Refresh authentication tokens');

  try {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken) {
      return formatResponse(400, false, 'Refresh token is required');
    }

    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: clientId,
      UserPoolId: userPoolId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };

    const authResult = await cognito.adminInitiateAuth(params).promise();

    return formatResponse(200, true, 'Tokens refreshed successfully', {
      tokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
      },
    });

  } catch (error) {
    console.error('Error in refresh:', error);
    return formatResponse(401, false, 'Invalid refresh token');
  }
};

/**
 * ✅ Get User Info Handler - Get authenticated user details
 */
module.exports.getUser = async (event) => {
  console.log('GET /auth/user - Get authenticated user details');

  try {
    const token = event.headers?.Authorization || event.headers?.authorization;
    
    if (!token) {
      return formatResponse(401, false, 'Authorization header required');
    }

    const accessToken = token.replace('Bearer ', '');
    const userDetails = await cognito.getUser({
      AccessToken: accessToken,
    }).promise();

    const attributes = {};
    userDetails.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });

    return formatResponse(200, true, 'User details retrieved', {
      userId: userDetails.Username,
      email: attributes.email,
      firstName: attributes.given_name || '',
      lastName: attributes.family_name || '',
      phone: attributes.phone_number || '',
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return formatResponse(401, false, 'Invalid or expired token');
  }
};

/**
 * ✅ Logout Handler - Invalidate user session
 */
module.exports.logout = async (event) => {
  console.log('POST /auth/logout - User logout');

  try {
    const body = JSON.parse(event.body || '{}');
    const { refreshToken } = body;

    if (!refreshToken) {
      return formatResponse(400, false, 'Refresh token is required');
    }

    // Note: Cognito doesn't have a direct logout endpoint
    // The client should discard tokens
    // For security, you could implement token blacklisting in DynamoDB

    return formatResponse(200, true, 'Logged out successfully');

  } catch (error) {
    console.error('Error in logout:', error);
    return formatResponse(500, false, 'Failed to logout');
  }
};

// ============================================================
// ✅ OTP-BASED AUTHENTICATION - NEW FLOW
// ============================================================

/**
 * ✅ Send OTP Handler - Create user in Cognito (unconfirmed) which sends verification code via Cognito's default email
 * POST /auth/send-otp
 */
module.exports.sendOTP = async (event) => {
  console.log('POST /auth/send-otp - Create unconfirmed Cognito user to trigger verification email');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, name, phone } = body;

    // Validation
    if (!email) {
      return formatResponse(400, false, 'Email is required');
    }

    if (!email.includes('@')) {
      return formatResponse(400, false, 'Please enter a valid email');
    }

    // Check if user already exists and is confirmed in Cognito
    try {
      const existingUser = await cognito.adminGetUser({
        UserPoolId: userPoolId,
        Username: email,
      }).promise();

      if (existingUser.UserStatus === 'CONFIRMED') {
        return formatResponse(409, false, 'Email already registered');
      }

      // User exists but is unconfirmed — delete and re-create to resend code
      await cognito.adminDeleteUser({
        UserPoolId: userPoolId,
        Username: email,
      }).promise();
      console.log('🗑️ Deleted unconfirmed user to re-create:', email);
    } catch (error) {
      if (error.code !== 'UserNotFoundException') {
        throw error;
      }
      // User doesn't exist — good, continue
    }

    // Generate a strong temporary password (user will set real password after verification)
    const tempPassword = 'Temp!' + crypto.randomBytes(12).toString('hex');

    const firstName = name ? name.split(' ')[0] : 'User';
    const lastName = name ? name.split(' ').slice(1).join(' ') : '';

    // Create user via signUp — Cognito will send verification code from no-reply@verificationemail.com
    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'given_name', Value: firstName },
      { Name: 'family_name', Value: lastName },
      { Name: 'name', Value: `${firstName} ${lastName}`.trim() },
      { Name: 'phone_number', Value: phone || '+10000000000' },
    ];

    const signupParams = {
      ClientId: clientId,
      Username: email,
      Password: tempPassword,
      UserAttributes: userAttributes,
    };

    const secretHash = computeSecretHash(email);
    if (secretHash) {
      signupParams.SecretHash = secretHash;
    }

    const signupResult = await cognito.signUp(signupParams).promise();
    console.log('✅ Unconfirmed user created, Cognito sending verification code to:', email);

    return formatResponse(200, true, `Verification code sent to ${email}. Please check your email.`, {
      email,
      userId: signupResult.UserSub,
      expiryMinutes: 10,
    });

  } catch (error) {
    console.error('Error in sendOTP:', error);

    if (error.code === 'UsernameExistsException') {
      return formatResponse(409, false, 'Email already registered');
    }
    if (error.code === 'InvalidPasswordException') {
      return formatResponse(400, false, 'Password policy error. Please try again.');
    }

    return formatResponse(500, false, error.message || 'Failed to send verification code');
  }
};

/**
 * ✅ Verify OTP Handler - Confirm Cognito user with verification code
 * POST /auth/verify-otp
 */
module.exports.verifyOTP = async (event) => {
  console.log('POST /auth/verify-otp - Confirm user with Cognito verification code');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, otp } = body;

    // Validation
    if (!email || !otp) {
      return formatResponse(400, false, 'Email and verification code are required');
    }

    // Confirm the signup with the verification code Cognito sent
    const confirmParams = {
      ClientId: clientId,
      Username: email,
      ConfirmationCode: otp.toString(),
    };

    const secretHash = computeSecretHash(email);
    if (secretHash) {
      confirmParams.SecretHash = secretHash;
    }

    await cognito.confirmSignUp(confirmParams).promise();
    console.log('✅ User confirmed in Cognito:', email);

    // Get user details from Cognito
    const userDetails = await cognito.adminGetUser({
      UserPoolId: userPoolId,
      Username: email,
    }).promise();

    const attributes = {};
    userDetails.UserAttributes.forEach((attr) => {
      attributes[attr.Name] = attr.Value;
    });

    const firstName = attributes.given_name || 'User';
    const lastName = attributes.family_name || '';
    const phone = attributes.phone_number || '';
    const userId = attributes.sub;

    // Store user data in DynamoDB
    const timestamp = new Date().toISOString();
    try {
      await dynamodb
        .put({
          TableName: USERS_TABLE,
          Item: {
            userId,
            email,
            firstName,
            lastName,
            phone,
            name: `${firstName} ${lastName}`.trim(),
            createdAt: timestamp,
            updatedAt: timestamp,
            registrationMethod: 'otp',
          },
        })
        .promise();
      console.log('✅ User stored in DynamoDB:', userId);
    } catch (dbErr) {
      console.warn('⚠️ Failed to store user in DynamoDB:', dbErr.message || dbErr);
    }

    return formatResponse(201, true, 'Account verified successfully. Please set your password.', {
      userId,
      email,
      firstName,
      lastName,
      phone,
      requiresPasswordSetup: true,
    });

  } catch (error) {
    console.error('Error in verifyOTP:', error);

    if (error.code === 'CodeMismatchException') {
      return formatResponse(400, false, 'Invalid verification code. Please try again.');
    }
    if (error.code === 'ExpiredCodeException') {
      return formatResponse(400, false, 'Verification code has expired. Please request a new one.');
    }
    if (error.code === 'NotAuthorizedException') {
      return formatResponse(400, false, 'User is already confirmed.');
    }
    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, false, 'User not found. Please start signup again.');
    }

    return formatResponse(500, false, error.message || 'Failed to verify code');
  }
};

/**
 * ✅ Resend OTP Handler - Resend Cognito verification code
 * POST /auth/resend-otp
 */
module.exports.resendOTP = async (event) => {
  console.log('POST /auth/resend-otp - Resend Cognito verification code');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email } = body;

    // Validation
    if (!email) {
      return formatResponse(400, false, 'Email is required');
    }

    const resendParams = {
      ClientId: clientId,
      Username: email,
    };

    const secretHash = computeSecretHash(email);
    if (secretHash) {
      resendParams.SecretHash = secretHash;
    }

    await cognito.resendConfirmationCode(resendParams).promise();
    console.log('✅ Verification code resent to:', email);

    return formatResponse(200, true, `Verification code resent to ${email}. Please check your email.`, {
      email,
      expiryMinutes: 10,
    });

  } catch (error) {
    console.error('Error in resendOTP:', error);

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, false, 'No signup found for this email. Please start again.');
    }
    if (error.code === 'InvalidParameterException') {
      return formatResponse(400, false, 'User is already confirmed.');
    }

    return formatResponse(500, false, error.message || 'Failed to resend verification code');
  }
};

/**
 * ✅ Set Password Handler - Allow user to set password after OTP signup
 * POST /auth/set-password
 */
module.exports.setPassword = async (event) => {
  console.log('POST /auth/set-password - Set password after OTP signup');

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, newPassword } = body;

    // Validation
    if (!email || !newPassword) {
      return formatResponse(400, false, 'Email and new password are required');
    }

    if (newPassword.length < 8) {
      return formatResponse(400, false, 'Password must be at least 8 characters');
    }

    // Set permanent password using admin API
    await cognito.adminSetUserPassword({
      UserPoolId: userPoolId,
      Username: email,
      Password: newPassword,
      Permanent: true,
    }).promise();

    console.log('✅ Password set for user:', email);

    return formatResponse(200, true, 'Password set successfully');

  } catch (error) {
    console.error('Error in setPassword:', error);

    if (error.code === 'UserNotFoundException') {
      return formatResponse(404, false, 'User not found');
    }

    return formatResponse(500, false, error.message || 'Failed to set password');
  }
};
