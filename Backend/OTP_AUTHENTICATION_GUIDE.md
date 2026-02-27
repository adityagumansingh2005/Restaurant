# OTP-Based Authentication Implementation Guide

## Overview

Your restaurant website has been upgraded with **OTP (One-Time Password) based authentication** instead of the traditional password-based signup. This guide explains the implementation, setup requirements, and deployment steps.

## What Changed

### Previous Flow
1. User enters email + password + name
2. Account created directly in Cognito
3. Auto-login

### New Flow (OTP-Based)
1. **Step 1 (Email Signup)**: User enters email, name, and phone
2. **Step 2 (OTP Verification)**: User receives 6-digit OTP via email
3. **Step 3 (Password Setup)**: User creates their password
4. **Auto-Login**: User logged in automatically

## Architecture

### Backend Components

#### 1. OTP Utility (`Backend/src/utils/otp.js`)
- **generateOTP()**: Creates random 6-digit OTP
- **sendOTPEmail()**: Sends OTP via AWS SES email
- **storeOTP()**: Saves OTP to DynamoDB with TTL
- **verifyOTP()**: Validates OTP code
- **resendOTP()**: Resends OTP to email
- **deleteOTP()**: Removes expired OTP

#### 2. Auth Handlers (`Backend/src/handlers/auth.js`)
New endpoints added:
- `POST /auth/send-otp` - Send OTP to email
- `POST /auth/verify-otp` - Verify OTP and create Cognito user
- `POST /auth/set-password` - Set permanent password
- `POST /auth/resend-otp` - Resend OTP code

#### 3. Frontend (`index.html` + `script.js`)
New signup flow with tabs:
- **signup**: Email & details entry
- **otp**: OTP verification with 6 input fields
- **password**: Password setup

### Frontend Functions

```javascript
// Step 1: Send OTP
handleSendOTP()           // Sends OTP to entered email

// Step 2: Verify OTP
handleVerifyOTP()         // Verifies 6-digit OTP
handleResendOTP()         // Resends OTP code

// Step 3: Set Password
handleSetPassword()       // Creates permanent password

// Helper
setupOTPInputNavigation() // Auto-focus between OTP fields
```

## Setup Requirements

### 1. Environment Variables

Create or update `.env` file in `Backend/` directory:

```bash
# AWS Configuration
AWS_REGION=us-east-1
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
COGNITO_CLIENT_SECRET=optional_secret

# DynamoDB Tables
USERS_TABLE=restaurant-api-users-dev
OTP_TABLE=restaurant-otp-codes-dev

# SES Email Configuration
SES_SENDER_EMAIL=noreply@restaurantdeliciousbites.com

# OTP Settings
OTP_EXPIRY_MINUTES=10
```

### 2. AWS DynamoDB Tables

#### OTP Table (`restaurant-otp-codes-dev`)

| Attribute | Type | Description |
|-----------|------|-------------|
| `email` | String (Primary Key) | User email |
| `otp` | String | 6-digit OTP code |
| `userData` | Map | Temporary user data (name, phone) |
| `attempts` | Number | Failed verification attempts |
| `maxAttempts` | Number | Maximum allowed attempts (5) |
| `createdAt` | String | Creation timestamp |
| `ttl` | Number | Unix timestamp for auto-deletion |

**Create Table**:
```bash
aws dynamodb create-table \
  --table-name restaurant-otp-codes-dev \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --ttl-specification AttributeName=ttl,Enabled=true
```

### 3. AWS SES Configuration

**Verify Sender Email**:
```bash
aws ses verify-email-identity --email-address noreply@restaurantdeliciousbites.com
```

**Check Sandbox Status** (for production, request production access):
```bash
aws ses describe-configuration-set --configuration-set-name default
```

### 4. Dependencies

Already installed in `package.json`:
- `aws-sdk` - AWS services (Cognito, SES, DynamoDB)
- `crypto` - OTP generation
- Other existing dependencies

## Signup Flow - Step by Step

### Step 1: Send OTP
```json
POST /auth/send-otp

Request:
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "555-1234"
}

Response:
{
  "success": true,
  "message": "OTP sent to user@example.com",
  "data": {
    "email": "user@example.com",
    "expiryMinutes": 10
  }
}
```

### Step 2: Verify OTP
```json
POST /auth/verify-otp

Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Account created successfully. Please set your password on next login.",
  "data": {
    "userId": "sub-xxx",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "requiresPasswordSetup": true
  }
}
```

### Step 3: Set Password
```json
POST /auth/set-password

Request:
{
  "email": "user@example.com",
  "newPassword": "SecurePassword123!"
}

Response:
{
  "success": true,
  "message": "Password set successfully"
}
```

### Step 4: Login
```json
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "sub-xxx",
    "email": "user@example.com",
    "tokens": {
      "accessToken": "...",
      "idToken": "...",
      "refreshToken": "..."
    }
  }
}
```

## Security Features

### OTP Security
- ✅ **Expiration**: OTP expires after 10 minutes (configurable)
- ✅ **Attempts Limit**: Max 5 verification attempts
- ✅ **No Password Storage**: OTP not stored permanently
- ✅ **Auto-deletion**: DynamoDB TTL auto-removes expired OTPs
- ✅ **Email Verification**: Email verified before Cognito account creation

### Password Security
- ✅ **Minimum Length**: 8 characters required
- ✅ **Cognito Compliance**: Follows Cognito password policies
- ✅ **Hashed Storage**: Passwords hashed by Cognito
- ✅ **Secure Transmission**: HTTPS only (production)

### Data Security
- ✅ **No Sensitive Data in Logs**: OTP not logged
- ✅ **Temporary Storage**: User data deleted after verification
- ✅ **CORS Configuration**: Restricted to allowed origins
- ✅ **Token-based Auth**: Sessions use secure tokens

## Frontend Features

### OTP Input UX
- **Auto-navigation**: Automatically moves to next field
- **Paste Support**: Pasting 6-digit code fills all fields
- **Backspace Navigation**: Backspace moves to previous field
- **Number-only**: Automatically filters non-numeric input
- **Visual Feedback**: Focus/valid states with color changes

### Error Handling
- Email already registered → 409 Conflict
- Invalid OTP → 400 Bad Request with remaining attempts
- OTP expired → 400 Bad Request
- Password mismatch → Client-side validation

### Success Notifications
- OTP sent successfully
- Email verified
- Account created
- Auto-login confirmation

## Customization

### Change OTP Expiry Time
In `.env`:
```bash
OTP_EXPIRY_MINUTES=15  # Changed from 10 minutes
```

### Change OTP Length
In `Backend/src/utils/otp.js`:
```javascript
const OTP_LENGTH = 8; // Changed from 6
// And update generateOTP():
return crypto.randomInt(10000000, 99999999).toString();
```

### Change Sender Email
In `.env`:
```bash
SES_SENDER_EMAIL=support@yourdomain.com
```

### Customize Email Template
In `Backend/src/utils/otp.js`, modify the HTML template in `sendOTPEmail()`:
```javascript
const htmlContent = `
  <!-- Customize HTML here -->
`;
```

## Deployment

### Local Development
```bash
cd Backend
npm install
npm start

# In another terminal, start frontend
npm run dev
```

### AWS Deployment

#### 1. Deploy Backend (Serverless Framework)
```bash
cd Backend
npm install
serverless deploy
```

#### 2. Set Environment Variables
In AWS Lambda → Function → Configuration → Environment Variables:
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET`
- `USERS_TABLE`
- `OTP_TABLE`
- `SES_SENDER_EMAIL`

#### 3. Update Frontend API URL
In `script.js`:
```javascript
// Change from:
const API_URL = 'http://localhost:3000';

// To:
const API_URL = 'https://your-api-gateway-url.amazonaws.com';
```

#### 4. Deploy Frontend
```bash
# Build and deploy to S3/CloudFront/GitHub Pages
```

## Troubleshooting

### OTP Not Arriving
1. **Check SES Status**: Verify email is verified in SES
2. **Check Spam Folder**: OTP emails might be in spam
3. **Verify Permissions**: SES role has `ses:SendEmail` permission
4. **Check Logs**: CloudWatch logs for send errors

### OTP Verification Fails
1. **Correct OTP?**: Verify user entered correct code
2. **Expired?**: OTP expires after 10 minutes
3. **Max Attempts?**: User exceeded 5 attempts, request new OTP
4. **Timing Issue**: System clock should be synchronized

### Password Setup Fails
1. **Password Requirements**: Min 8 chars, uppercase, lowercase, numbers
2. **User Exists**: Email might already exist in Cognito
3. **Permissions**: Lambda role needs Cognito permissions

### SES Throttling
If getting throttle errors:
1. Request SES limit increase (AWS Support)
2. Implement exponential backoff retry
3. Consider SNS alternative for prod

## Monitoring & Logs

### CloudWatch Logs
```bash
# Check Lambda logs
aws logs tail /aws/lambda/auth-function --follow

# Check specific OTP error
aws logs grep "OTP" /aws/lambda/auth-function
```

### Metrics to Monitor
- OTP send success rate
- OTP verification success rate
- Average OTP verification time
- Failed login attempts
- OTP resend frequency

## Future Enhancements

1. **SMS OTP**: Send OTP via SMS instead of email
2. **Google/Facebook Login**: OAuth integration
3. **TOTP**: Time-based one-time passwords
4. **Device Trust**: Remember device for 30 days
5. **Backup Codes**: Alternative verification method
6. **Rate Limiting**: Limit OTP requests per IP
7. **Geo-Blocking**: Block logins from unusual locations

## API Reference

### POST /auth/send-otp
Send OTP code to email

**Request:**
```javascript
{
  "email": "string",      // Required
  "name": "string",       // Required
  "phone": "string"       // Optional
}
```

**Response:**
```javascript
{
  "success": boolean,
  "message": "string",
  "data": {
    "email": "string",
    "expiryMinutes": number
  }
}
```

### POST /auth/verify-otp
Verify OTP and create account

**Request:**
```javascript
{
  "email": "string",      // Required
  "otp": "string"         // 6-digit code
}
```

**Response:**
```javascript
{
  "success": boolean,
  "message": "string",
  "data": {
    "userId": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "requiresPasswordSetup": boolean
  }
}
```

### POST /auth/resend-otp
Resend OTP to email

**Request:**
```javascript
{
  "email": "string"       // Required
}
```

**Response:**
```javascript
{
  "success": boolean,
  "message": "string",
  "data": {
    "email": "string",
    "expiryMinutes": number
  }
}
```

### POST /auth/set-password
Set permanent password

**Request:**
```javascript
{
  "email": "string",           // Required
  "newPassword": "string"      // Min 8 chars
}
```

**Response:**
```javascript
{
  "success": boolean,
  "message": "string"
}
```

## Support & Issues

For issues or questions:
1. Check CloudWatch logs
2. Verify environment variables
3. Test API endpoints with Postman
4. Check AWS IAM permissions
5. Review error messages in browser console

## Files Modified

- ✅ `Backend/src/utils/otp.js` - NEW OTP utility
- ✅ `Backend/src/handlers/auth.js` - Added OTP endpoints
- ✅ `Backend/app.js` - Added new routes
- ✅ `index.html` - Updated signup form with OTP tabs
- ✅ `script.js` - Implemented OTP flow functions
- ✅ `style.css` - Added OTP input styling

## Summary

Your authentication system is now **more secure** with email-verified OTP-based signup, **better UX** with intuitive multi-step flow, and **easier password management** with separate password setup step. The system automatically handles expiration, rate limiting, and error cases.

Happy coding! 🚀
