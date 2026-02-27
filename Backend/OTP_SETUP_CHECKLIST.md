# OTP Authentication Setup Checklist

## Quick Setup Guide for OTP-Based Authentication

### Prerequisites
- AWS Account with Cognito and DynamoDB
- SES email verified
- Node.js 14+ installed
- npm dependencies installed

### Step 1: Configure Environment Variables

1. **Open** `Backend/.env` file
2. **Update** the following values:

```bash
# AWS Cognito
COGNITO_USER_POOL_ID=your_pool_id
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret

# DynamoDB
USERS_TABLE=restaurant-api-users-dev
OTP_TABLE=restaurant-otp-codes-dev

# Email
SES_SENDER_EMAIL=your-verified-email@example.com

# OTP
OTP_EXPIRY_MINUTES=10
```

### Step 2: Create DynamoDB Tables

Run these commands to create required tables:

```bash
# Create OTP Table with TTL
aws dynamodb create-table \
  --table-name restaurant-otp-codes-dev \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable TTL on OTP table
aws dynamodb update-time-to-live \
  --table-name restaurant-otp-codes-dev \
  --time-to-live-specification AttributeName=ttl,Enabled=true \
  --region us-east-1

# Verify Users Table exists (created previously)
aws dynamodb describe-table \
  --table-name restaurant-api-users-dev \
  --region us-east-1
```

### Step 3: Verify SES Email

```bash
# Verify sender email in SES
aws ses verify-email-identity \
  --email-address your-verified-email@example.com \
  --region us-east-1

# Check verification status
aws ses verify-email-identity --email-address your-verified-email@example.com
```

### Step 4: Update Cognito User Pool (Optional)

Recommended settings for better UX:

1. **Open AWS Console → Cognito**
2. **Select your User Pool**
3. **Policies:**
   - Minimum password length: 8
   - Require uppercase: Yes
   - Require lowercase: Yes
   - Require numbers: Yes
4. **User Sign-up & Account Recovery:**
   - Enable self sign-up: No (using OTP flow)
   - Email verification: Required

### Step 5: Test Local Setup

```bash
# Navigate to Backend
cd Backend

# Install dependencies (if not done)
npm install

# Start development server
npm start

# Server should run on http://localhost:3000
```

### Step 6: Test Frontend

1. **Open** `index.html` in a web browser
2. **Navigate to** "Sign Up" tab
3. **Fill in:**
   - Name: Test User
   - Email: your-verified-email@example.com
   - Phone: (optional)
4. **Click** "Send OTP Code"
5. **Check email** for OTP code
6. **Enter OTP** in the verification form
7. **Set password** (min 8 chars)
8. **Login** with email and password

### Step 7: Deploy to AWS (Production)

```bash
# Install Serverless Framework
npm install -g serverless

# Deploy
cd Backend
serverless deploy

# Note the API Gateway URL from deployment output
# Update in script.js:
# const API_URL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com';
```

## Troubleshooting

### Issue: "OTP email not received"

**Solution 1: Check SES Sandbox Status**
```bash
aws ses describe-account-attributes --region us-east-1
```

If in sandbox mode:
1. AWS Console → SES → Email Addresses
2. Verify recipient email as well
3. Request production access

**Solution 2: Check SES Permissions**
```bash
# Make sure IAM role has:
aws iam get-user-policy --user-name your-user --policy-name ses-access
```

**Solution 3: Check Email Deliverability**
```bash
aws ses get-account-sending-enabled --region us-east-1
```

### Issue: "OTP verification failed"

**Possible causes:**
1. OTP expired (> 10 minutes)
2. Maximum attempts exceeded (5 attempts)
3. User already exists in Cognito
4. Database connectivity issue

**Debug:**
```bash
# Check DynamoDB table
aws dynamodb scan --table-name restaurant-otp-codes-dev

# Check Cognito user
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_xxxxx \
  --username test@example.com
```

### Issue: "Lambda timeout"

**Solution:**
1. Increase Lambda timeout: AWS Console → Lambda → Configuration → 30 seconds
2. Check CloudWatch logs: AWS Console → CloudWatch → Log Groups → `/aws/lambda/`

### Issue: "DynamoDB throttling"

**Solution:**
1. Change billing mode to `PAY_PER_REQUEST` (already set)
2. Or increase provisioned capacity if using provisioned mode

## File Reference

### Backend Files

| File | Purpose |
|------|---------|
| `Backend/src/utils/otp.js` | OTP generation, sending, verification |
| `Backend/src/handlers/auth.js` | Authentication endpoints with OTP |
| `Backend/app.js` | Express routes for OTP endpoints |
| `Backend/.env` | Environment variables (create from .env.example) |

### Frontend Files

| File | Purpose |
|------|---------|
| `index.html` | OTP form tabs (signup, OTP, password) |
| `script.js` | OTP flow functions, auto-navigation |
| `style.css` | OTP input styling |

## API Endpoints

All endpoints return JSON responses:

```
POST /auth/send-otp      → Send OTP to email
POST /auth/verify-otp    → Verify OTP code
POST /auth/resend-otp    → Resend OTP
POST /auth/set-password  → Set permanent password
POST /auth/login         → Login with email & password
```

## Environment Variables Explained

| Variable | Example | Purpose |
|----------|---------|---------|
| `AWS_REGION` | `us-east-1` | AWS region for all services |
| `COGNITO_USER_POOL_ID` | `us-east-1_xxxxx` | Cognito User Pool identifier |
| `COGNITO_CLIENT_ID` | `xxxxxxxxxxxxxxxxx` | App client ID in Cognito |
| `USERS_TABLE` | `restaurant-api-users-dev` | DynamoDB users table |
| `OTP_TABLE` | `restaurant-otp-codes-dev` | DynamoDB OTP storage table |
| `SES_SENDER_EMAIL` | `no-reply@example.com` | Verified SES sender email |
| `OTP_EXPIRY_MINUTES` | `10` | OTP validity duration |

## Next Steps

1. ✅ Configure environment variables
2. ✅ Create DynamoDB tables
3. ✅ Verify SES email
4. ✅ Test locally
5. ✅ Deploy to AWS
6. ✅ Update frontend API URL
7. ✅ Test in production

## Support

If you encounter issues:

1. **Check CloudWatch Logs**
   ```bash
   aws logs tail /aws/lambda/auth-function --follow
   ```

2. **Check Function Configuration**
   ```bash
   aws lambda get-function-configuration --function-name auth
   ```

3. **Test API Endpoint**
   ```bash
   curl -X POST http://localhost:3000/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test"}'
   ```

## Security Best Practices

✅ **Do This:**
- Store sensitive config in environment variables
- Use HTTPS in production
- Enable CloudTrail for AWS API calls
- Regularly rotate credentials
- Enable MFA for AWS console
- Use IAM roles, not root access

❌ **Don't Do This:**
- Hardcode API keys in code
- Commit .env file to Git
- Use same credentials across environments
- Disable CloudWatch logging
- Allow unrestricted API access

---

**Last Updated**: February 2026
**Version**: 1.0
