# Frontend & Backend Integration Summary

## 🎯 What Was Added

### Frontend Enhancements

#### 1. **Advanced Authentication Modal**
- Separate login and signup tabs
- Form validation with error messages
- Smooth animations and transitions
- Improved UX with clear feedback

#### 2. **Session Management**
- SessionStorage-based token management
- Auto-restore session on page reload
- Automatic logout on token expiration
- Secure token cleanup

#### 3. **User Profile UI**
- Display logged-in user name in navbar
- One-click logout functionality
- User-friendly profile box
- Responsive design

#### 4. **API Integration**
- Seamless backend API communication
- JWT token handling (Bearer token)
- Authenticated API requests
- Error handling and notifications

#### 5. **Notification System**
- Success/error/info notifications
- Auto-dismissing messages (3 seconds)
- Top-right corner display
- Smooth slide-in/out animations

## 🔗 Frontend to Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HTML (index.html)           CSS (style.css)               │
│  ├── Auth Modal             ├── Modal Styling              │
│  ├── Login Form             ├── Notification Styling       │
│  ├── Signup Form            ├── Responsive Design          │
│  └── User Profile Box       └── Animations                 │
│                                                             │
│  JavaScript (script.js)                                     │
│  ├── handleSignup()         ← API Call → POST /auth/signup │
│  ├── handleLogin()          ← API Call → POST /auth/login  │
│  ├── handleLogout()         → Clear Token & UI Update      │
│  ├── createOrder()          ← API Call + Auth → POST /orders
│  ├── getOrders()            ← API Call + Auth → GET /orders
│  ├── getMenu()              ← API Call → GET /menu         │
│  └── Token Management       ← SessionStorage               │
│                                                             │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/HTTPS
                             │ JWT Token in Header
                             │
┌────────────────────────────▼────────────────────────────────┐
│                  BACKEND (Serverless API)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Endpoints (http://localhost:3000)                     │
│  ├── POST /auth/signup     → Create User Account           │
│  ├── POST /auth/login      → Authenticate User             │
│  ├── GET /menu             → Fetch Menu Items              │
│  ├── POST /orders          → Create Order (Protected)      │
│  ├── GET /orders           → List Orders (Protected)       │
│  ├── GET /orders/{id}      → Get Order (Protected)         │
│  ├── PUT /orders/{id}      → Update Order (Protected)      │
│  ├── DELETE /orders/{id}   → Delete Order (Protected)      │
│  └── GET /health           → Check API Health              │
│                                                             │
│  Utilities                                                  │
│  ├── JWT Generation & Verification                         │
│  ├── Password Hashing (bcryptjs)                           │
│  └── Token Management                                      │
│                                                             │
│  Database                                                   │
│  └── DynamoDB (restaurant-users-dev table)                 │
│      ├── userId (PK)                                       │
│      ├── email (GSI)                                       │
│      ├── password (hashed)                                 │
│      ├── firstName, lastName, phone                        │
│      └── createdAt, updatedAt                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 API Request/Response Examples

### Signup Request
```javascript
// Frontend sends to backend
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890"
}
```

### Signup Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2026-02-05T12:34:56.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Authenticated API Request (Create Order)
```javascript
// Frontend sends to backend with token
POST /orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "items": [
    { "id": 1, "name": "Pizza", "price": 12.99 }
  ],
  "totalPrice": 12.99,
  "customerName": "John Doe",
  "customerEmail": "john@example.com"
}
```

### Authenticated API Response (Create Order)
```json
{
  "success": true,
  "data": {
    "id": "order-12345",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [...],
    "totalPrice": 12.99,
    "status": "pending",
    "createdAt": "2026-02-05T12:35:00.000Z"
  }
}
```

## 🔐 Authentication Flow

### Step 1: User Signup
```
User fills signup form
    ↓
Validates input (frontend)
    ↓
Sends POST /auth/signup
    ↓
Backend validates & creates user
    ↓
Backend hashes password with bcryptjs
    ↓
Stores user in DynamoDB
    ↓
Generates JWT token (24h expiry)
    ↓
Returns user data + token
    ↓
Frontend stores token in sessionStorage
    ↓
Frontend shows user profile
    ↓
✅ User authenticated
```

### Step 2: User Login
```
User fills login form
    ↓
Validates input (frontend)
    ↓
Sends POST /auth/login
    ↓
Backend finds user by email
    ↓
Backend compares password with hash
    ↓
If match: generates JWT token
    ↓
Returns user data + token
    ↓
Frontend stores token in sessionStorage
    ↓
Frontend shows user profile
    ↓
✅ User authenticated
```

### Step 3: Protected API Call
```
User clicks "Place Order"
    ↓
Frontend checks for token
    ↓
If no token: show login modal
    ↓
If token exists: add to Authorization header
    ↓
Sends POST /orders with Bearer token
    ↓
Backend verifies token signature
    ↓
Backend checks token expiration
    ↓
Backend extracts userId from token
    ↓
Associates order with user
    ↓
Saves to database
    ↓
Returns order data
    ↓
Frontend shows success message
    ↓
✅ Order created
```

## 📁 Project Structure

```
Restaurant Website/
│
├── Root Level
│   ├── index.html              ✅ UPDATED (Auth Modal)
│   ├── script.js               ✅ NEW (Complete rewrite)
│   ├── style.css               ✅ UPDATED (Auth styling)
│   ├── FRONTEND_GUIDE.md        ✅ NEW (This file)
│   └── [Other existing files]
│
└── Backend/
    ├── app.js                  ✅ UPDATED (Auth routes)
    ├── server.js               ✅ Created (Local server)
    ├── index.js                ✅ Created (Entry point)
    ├── serverless.yml          ✅ UPDATED (DynamoDB table)
    ├── package.json            ✅ UPDATED (Dependencies)
    ├── .env                    ✅ Created (Config)
    ├── .env.example            ✅ Created (Template)
    │
    ├── src/handlers/
    │   ├── auth.js             ✅ NEW (Signup/Login)
    │   ├── menu.js             ✅ Existing
    │   ├── orders.js           ✅ UPDATED (Auth)
    │   └── health.js           ✅ Existing
    │
    ├── src/utils/
    │   ├── auth.js             ✅ NEW (JWT/Password)
    │   └── users.js            ✅ NEW (DynamoDB users)
    │
    └── Documentation/
        ├── AUTHENTICATION.md   ✅ NEW
        ├── AUTH_IMPLEMENTATION.md ✅ NEW
        └── README.md           ✅ UPDATED
```

## 🚀 Getting Started

### 1. Start Backend Server
```bash
cd Backend
npm run server
# or
node index.js
```

Backend runs on: `http://localhost:3000`

### 2. Open Frontend
```bash
Open index.html in browser
```

Or serve with local server:
```bash
# Using Python
python -m http.server 8000

# Using Node
npx serve

# Using Live Server VS Code extension
```

### 3. Test Authentication

**Signup:**
1. Click "Login / Signup"
2. Click "Sign Up"
3. Fill form with test data
4. Click "Create Account"
5. See success notification
6. User name appears in navbar

**Login:**
1. Click "Logout"
2. Click "Login / Signup"
3. Enter email and password
4. Click "Login"
5. See success notification
6. User name appears in navbar

**Place Order:**
1. Login first
2. Should be able to create orders
3. Try without login - should prompt to login

## 🔑 Key Technologies

### Frontend Stack
- **HTML5** - Semantic markup
- **CSS3** - Styling & animations
- **JavaScript (ES6+)** - Authentication logic
- **Fetch API** - HTTP requests
- **SessionStorage** - Token persistence

### Backend Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **JWT** - Token management
- **bcryptjs** - Password hashing
- **AWS DynamoDB** - Database
- **Serverless Framework** - Deployment

### Infrastructure
- **AWS Lambda** - Function hosting
- **AWS DynamoDB** - Database
- **AWS API Gateway** - REST endpoints
- **LocalStack** - Local testing

## 🔒 Security Features

| Feature | Frontend | Backend | 
|---------|----------|---------|
| Password Hashing | ❌ | ✅ bcryptjs |
| JWT Generation | ❌ | ✅ jsonwebtoken |
| Token Validation | ✅ Check exists | ✅ Verify signature |
| Token Storage | ✅ SessionStorage | ⚠️ In header only |
| HTTPS | ⚠️ Dev only | ⚠️ Dev only |
| Input Validation | ✅ Yes | ✅ Yes |
| Error Responses | ✅ Generic | ✅ Generic |

## 📊 Data Flow

### Signup Data Flow
```
Frontend Form Input
    ↓ (sanitize)
Call handleSignup()
    ↓ (validate)
Fetch POST /auth/signup
    ↓
Backend Validation
    ↓ (parse, check email duplicate)
bcryptjs.hash(password)
    ↓
Insert to DynamoDB
    ↓
JWT.sign() token
    ↓
Return {user, token}
    ↓
sessionStorage.setItem(token)
    ↓
updateUIAfterLogin()
    ↓
Show notification
    ↓
✅ Complete
```

## ⚙️ Configuration

### Change Backend URL
Edit `script.js`:
```javascript
// Line 5
const API_URL = 'https://api.production.com';
```

### Change JWT Secret
Edit `Backend/.env`:
```
JWT_SECRET=your-production-secret-key-here
```

### Change Database Table
Edit `Backend/.env`:
```
USERS_TABLE=restaurant-users-prod
```

## 🧪 Testing Endpoints

### Using Browser Console
```javascript
// Check if authenticated
window.auth.getUser()
window.auth.getToken()

// Test API call
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Using cURL
```bash
# Signup
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"Test"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Protected endpoint
curl -X GET http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Debugging

### Browser Console
```javascript
// Enable logging
console.log = (...args) => {
  document.body.appendChild(
    Object.assign(document.createElement('pre'), {
      textContent: JSON.stringify(args)
    })
  );
};
```

### Check Storage
```javascript
// View stored token
sessionStorage.getItem('auth_token')

// View stored user
JSON.parse(sessionStorage.getItem('user_data'))
```

### Network Debugging
1. Open DevTools (F12)
2. Go to Network tab
3. Perform login/signup
4. Click on request to see details
5. Check Response tab for API response

## 📱 Mobile Responsive

The authentication system is fully responsive:
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1440px+)

Modal adapts to screen size ensuring good UX on all devices.

## 🎓 Learning Resources

- **JWT:** https://jwt.io/
- **Fetch API:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **SessionStorage:** https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
- **DynamoDB:** https://aws.amazon.com/dynamodb/
- **Serverless Framework:** https://www.serverless.com/

## 📝 Next Steps

1. **Test Thoroughly**
   - Signup and login
   - Create and manage orders
   - Test on mobile devices

2. **Deploy Backend**
   - Update AWS credentials
   - Deploy to AWS Lambda
   - Update API_URL in frontend

3. **Deploy Frontend**
   - Build production version
   - Deploy to hosting service
   - Update CORS settings

4. **Add Features**
   - Password reset
   - Email verification
   - Order tracking
   - Payment integration

5. **Production Hardening**
   - Enable HTTPS
   - Add rate limiting
   - Add request logging
   - Set up monitoring
   - Add database backups

---

**Last Updated:** February 5, 2026  
**Status:** ✅ Frontend & Backend Integration Complete  
**Version:** 1.0.0
