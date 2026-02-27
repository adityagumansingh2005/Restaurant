# AWS Cognito Setup - Complete Integration Guide

## ✅ What's Been Configured

Your Cognito user pool is now connected to your website! Here's what's been set up:

### Backend Configuration
- **User Pool ID:** `us-east-1_u2c4NVWFd`
- **Client ID:** `4um4b8gu22hak09cg67d457i32`
- **Region:** `us-east-1`
- **Password Policy:** Minimum 8 characters, uppercase, lowercase, and numbers

### Updated Files
1. `.env` - Added Cognito credentials
2. `serverless.yml` - Updated to use your existing Cognito user pool
3. `script.js` - Already configured for Cognito authentication

---

## 🚀 Next Steps

### Step 1: Deploy Backend to AWS (Required)

```bash
cd Backend
npm install
serverless deploy
```

This will deploy your API endpoints:
- `POST /auth/signup` - Register new users
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh expired tokens
- `GET /auth/user` - Get authenticated user info

**Save the API Gateway URL** - You'll need it for the frontend.

### Step 2: Update Frontend (script.js)

After deployment, update the API URL in `script.js`:

```javascript
// Line 8 in script.js - Replace with your API Gateway URL
const API_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev';
```

Example: `https://9pzoz0sj91.execute-api.us-east-1.amazonaws.com/dev`

### Step 3: Configure Cognito App Client (AWS Console)

1. Go to AWS Cognito → User Pools → `us-east-1_u2c4NVWFd`
2. Click "App Client Settings" for `4um4b8gu22hak09cg67d457i32`
3. Under **Authentication Flows**, ensure these are enabled:
   - ✅ ADMIN_NO_SRP_AUTH
   - ✅ ALLOW_REFRESH_TOKEN_AUTH
4. Save changes

---

## 📋 How Authentication Works

### Signup Flow
```
User enters email/password → 
POST /auth/signup → 
Cognito creates user → 
Auto-confirmed (email verified) → 
Returns tokens → 
Stored in sessionStorage
```

### Login Flow
```
User enters email/password → 
POST /auth/login → 
Cognito authenticates → 
Returns access, ID, and refresh tokens → 
Stored in sessionStorage → 
UI updates to show logged-in state
```

### API Requests
```
User wants to create order → 
JS includes token in Authorization header → 
POST /orders with "Authorization: Bearer {token}" → 
API validates token with Cognito → 
Process request
```

### Token Refresh
```
Access token expires (after 1 hour) → 
API returns 401 → 
JS automatically calls POST /auth/refresh → 
Gets new tokens → 
Retries original request
```

---

## 🧪 Testing the Integration

### 1. Test Signup
```bash
curl -X POST https://YOUR_API/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "us-east-1_u2c4NVWFd:xxx-xxx-xxx",
    "email": "test@example.com",
    "firstName": "John",
    "tokens": {
      "accessToken": "eyJkb2N...",
      "idToken": "eyJkb2N...",
      "refreshToken": "eyJkb2N..."
    }
  }
}
```

### 2. Test Login
```bash
curl -X POST https://YOUR_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 3. Test Protected Endpoint (Orders)
```bash
curl -X GET https://YOUR_API/orders \
  -H "Authorization: Bearer {accessToken}"
```

---

## 🔐 Security Features

✅ **Passwords:** Hashed and managed by AWS Cognito
✅ **Tokens:** Stored in `sessionStorage` (cleared on browser close)
✅ **Auto Refresh:** Expired tokens automatically refreshed
✅ **HTTPS Only:** All communication encrypted
✅ **CORS:** Configured for your domain
✅ **JWT Validation:** API validates tokens with Cognito

---

## 📝 Environment Variables (.env)

Your backend environment is already configured:

```
COGNITO_USER_POOL_ID=us-east-1_u2c4NVWFd
COGNITO_CLIENT_ID=4um4b8gu22hak09cg67d457i32
COGNITO_REGION=us-east-1
```

---

## 🆘 Troubleshooting

### "Invalid Client ID" Error
→ Verify `COGNITO_CLIENT_ID` in `.env` and `serverless.yml`

### "User not confirmed" Error
→ Your backend auto-confirms users during signup (shouldn't happen)

### 401 Unauthorized on API Requests
→ Token may be expired. The frontend automatically refreshes it.
→ If still failing, user may need to login again.

### CORS Errors
→ Ensure API Gateway has CORS enabled
→ Check `CORS_ORIGIN=*` in `.env`

### "Cognito User Pool not found"
→ Make sure you deployed: `serverless deploy`
→ Verify region is `us-east-1`

---

## 📚 User Attributes Stored in Cognito

- `email` - User email address
- `email_verified` - Automatically set to true
- `given_name` - First name
- `family_name` - Last name
- `phone_number` - Phone number
- `sub` - Unique user ID (UUID)

---

## 🔄 Token Lifetime

- **Access Token:** 1 hour
- **ID Token:** 1 hour
- **Refresh Token:** 30 days

Your frontend automatically handles refresh before expiration.

---

## ✨ What's Next?

1. **Deploy backend:** `serverless deploy`
2. **Update script.js:** Add API Gateway URL
3. **Test signup/login:** Use the forms on your website
4. **Connect other endpoints:** Menu, orders, reservations

Your website is now ready for user authentication! 🎉
