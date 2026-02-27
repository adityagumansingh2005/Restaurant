# AWS Cognito Authentication Migration

## Overview
Successfully migrated from simple JWT authentication to **AWS Cognito User Pool** authentication using the Serverless Framework.

## What Changed

### Backend Changes

#### 1. **serverless.yml** 
- ✅ Added Cognito User Pool resource
- ✅ Added Cognito User Pool Client resource
- ✅ Added Cognito JWT authorizer for API Gateway
- ✅ Added Cognito IAM permissions to Lambda roles
- ✅ Added Cognito authorizer to protected endpoints (orders, reservations)
- ✅ Added CloudFormation outputs for Cognito IDs

**Key Features:**
- User Pool Password Policy: Minimum 8 characters, uppercase, lowercase, numbers
- Email auto-verified: Users don't need email confirmation
- OAuth 2.0 support enabled for future web/mobile apps
- Admin authentication flow enabled for login

#### 2. **src/handlers/auth.js** - Complete Rewrite
Old approach: Manual password hashing and JWT token generation
New approach: AWS Cognito handles all authentication

**New Functions:**
```javascript
module.exports.signup     // Register user in Cognito User Pool
module.exports.login      // Authenticate with Cognito
module.exports.refresh    // Refresh access tokens
module.exports.getUser    // Get authenticated user details
module.exports.logout     // Logout handler
```

**Changes:**
- Uses AWS SDK's CognitoIdentityServiceProvider client
- Handles Cognito-specific error codes (UsernameExistsException, InvalidPasswordException, etc.)
- Returns Cognito tokens (accessToken, idToken, refreshToken)

#### 3. **src/handlers/orders.js**
- Updated to extract userId from Cognito authorizer context
- Changed from `event.requestContext?.authorizer?.userId` to:
  ```javascript
  const authorizer = event.requestContext?.authorizer;
  const userId = authorizer?.claims?.sub || authorizer?.principalId;
  const userEmail = authorizer?.claims?.email;
  ```

#### 4. **src/handlers/reservations.js**
- Same authorizer context extraction as orders
- Now gets userId from Cognito token claims instead of request body
- Improved security - userId cannot be spoofed

### Frontend Changes

#### **script.js** - Major Updates

**Old State Management:**
```javascript
let authToken = null;
```

**New State Management:**
```javascript
let accessToken = null;      // From Cognito
let idToken = null;          // From Cognito
let refreshToken = null;     // For token refresh
let currentUser = null;      // User metadata
```

**New Functions:**
1. **refreshAccessToken()** - Automatically refreshes expired tokens
   - Called when API returns 401 status
   - Updates both access and ID tokens
   - Retries the original request

2. **authenticatedFetch()** - Enhanced with token refresh logic
   - Uses Cognito access token in Authorization header
   - Handles token expiration gracefully
   - Retries requests after token refresh

3. **handleSignup()** - Now includes auto-login
   - Creates user in Cognito
   - Automatically logs in after signup
   - Stores all three token types

4. **handleLogin()** - Enhanced for Cognito
   - Uses Cognito's ADMIN_NO_SRP_AUTH flow
   - Retrieves user attributes from Cognito
   - Stores Cognito tokens

## Deployment Steps

### 1. Install Dependencies (if not already done)
```bash
cd Backend
npm install aws-sdk
```

### 2. Deploy to AWS
```bash
serverless deploy
```

This will:
- Create Cognito User Pool: `restaurant-api-userpool-dev`
- Create Cognito User Pool Client
- Update Lambda functions with Cognito configuration
- Create DynamoDB tables (if creating for first time)
- Set up API Gateway with Cognito authorizer

### 3. Get Cognito Configuration
After deployment, outputs will show:
```
CognitoUserPoolId: us-east-1_xxxxxxxxx
CognitoClientId: xxxxxxxxxxxxxxxxxxxx
```

Store these for frontend configuration if needed.

## API Endpoints - Cognito Enabled

### Authentication (No Authorization Required)
```
POST   /auth/signup           # Register new user
POST   /auth/login            # Login with email/password
POST   /auth/refresh          # Refresh access token
GET    /auth/user             # Get user details (requires access token)
POST   /auth/logout           # Logout
```

### Protected Endpoints (Require Access Token)
```
Orders:
  POST   /orders              # Create order
  GET    /orders              # Get all orders
  GET    /orders/{id}         # Get single order
  PUT    /orders/{id}         # Update order
  DELETE /orders/{id}         # Delete order

Reservations:
  POST   /reservations        # Create reservation
  GET    /reservations        # Get user's reservations
  GET    /reservations/{id}   # Get single reservation
  PUT    /reservations/{id}   # Update reservation
  DELETE /reservations/{id}   # Delete reservation
```

### Public Endpoints
```
GET    /menu                  # Get menu items
GET    /health                # Health check
```

## Token Flow

### Signup
```
User fills signup form
    ↓
POST /auth/signup
    ↓
Cognito creates user
    ↓
User auto-confirmed (no email needed)
    ↓
Auto-login with password
    ↓
Receive: { accessToken, idToken, refreshToken, userData }
    ↓
Store tokens in sessionStorage
```

### Login
```
User enters email/password
    ↓
POST /auth/login with credentials
    ↓
Cognito authenticates (ADMIN_NO_SRP_AUTH flow)
    ↓
Receive: { accessToken, idToken, refreshToken, userData }
    ↓
Store tokens in sessionStorage
```

### Token Refresh (Automatic)
```
API call fails with 401
    ↓
Call POST /auth/refresh with refreshToken
    ↓
Cognito issues new { accessToken, idToken }
    ↓
Update tokens in sessionStorage
    ↓
Retry original request
```

## Frontend Usage

### Before Cognito
```javascript
// Old way
const data = { email, password };
const response = await fetch(`${API_URL}/auth/login`, options);
const token = response.token;
headers['Authorization'] = `Bearer ${token}`;
```

### After Cognito
```javascript
// New way - same from user perspective
const data = { email, password };
const response = await fetch(`${API_URL}/auth/login`, options);
// Tokens are handled automatically by script.js
// Just call authenticatedFetch() for API requests
```

## Security Improvements

1. **Managed Service**: Cognito handles password security, not your code
2. **Token Expiration**: Access tokens expire (configurable), refresh tokens enable renewed access
3. **MFA Ready**: Cognito supports optional MFA without code changes
4. **Password Policy**: Enforced strong password requirements
5. **Audit Logs**: CloudTrail tracks all Cognito operations
6. **No Password Storage**: Passwords never stored in your database

## Migration Checklist

- ✅ Cognito User Pool created
- ✅ User Pool Client configured with auth flows
- ✅ Lambda authorizer configured
- ✅ Protected endpoints have authorizer attached
- ✅ Auth handlers use Cognito SDK
- ✅ Frontend updated for token refresh
- ✅ Error handling for Cognito error codes
- ✅ Token expiration handling

## Testing

### 1. Deploy and Get Outputs
```bash
serverless deploy
# Note the API URLs and Cognito IDs from outputs
```

### 2. Test Signup via Frontend
- Navigate to website
- Click Login/Signup
- Click "Sign Up" tab
- Fill in form with:
  - Name: Test User
  - Email: test@example.com
  - Password: TestPassword123 (must meet policy)
  - Phone: (optional)
- Click "Create Account"

### 3. Test Login
- Fill in email and password from signup
- Click "Login"
- Should see username in dropdown

### 4. Test Protected Endpoints
- Open browser console
- Call: `await api.getOrders()`
- Should return orders (or empty if none exist)

### 5. Test Token Refresh
- Login
- Wait or manually expire token
- Make API call
- Should auto-refresh and succeed

## Troubleshooting

### "User does not exist" during login
- User must have been created via signup endpoint
- Cognito auto-confirms emails (no email verification needed in dev)

### "Invalid Password" error
- Password must be 8+ characters
- Must contain uppercase, lowercase, and numbers
- Cannot contain symbols in current configuration

### API returns 401 Unauthorized
- Access token may be expired
- Check browser console for auto-refresh message
- If refresh fails, user needs to login again

### "Identity pool not configured"
- This uses User Pool, not Identity Pool
- No Identity Pool setup needed

## Future Enhancements

1. **Email Verification**: Remove auto-confirm, send verification emails
2. **MFA Support**: Enable Multi-Factor Authentication
3. **Social Login**: Add Google, Facebook, GitHub login
4. **User Attributes**: Add custom attributes (restaurant preferences, dietary restrictions, etc.)
5. **Password Reset**: Self-service password reset flow
6. **Account Management**: Allow users to change email, password
7. **User Pools per Environment**: Different pools for dev/staging/production

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Serverless Framework Cognito Plugin](https://serverless.com/blog/serverless-authentication-with-cognito/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [API Gateway JWT Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html)
