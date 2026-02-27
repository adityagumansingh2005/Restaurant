# Restaurant API - Serverless Framework Backend

A serverless restaurant management API built with AWS Lambda and the Serverless Framework.

## Features

- **Menu Management**: Get restaurant menu items
- **Order Management**: Create, read, update, and delete orders
- **Health Check**: API status endpoint
- **CORS Enabled**: Easy integration with frontend applications
- **Offline Development**: Run locally with serverless-offline

## Project Structure

```
Backend/
├── src/
│   └── handlers/
│       ├── menu.js      # Menu endpoints
│       ├── orders.js    # Order management endpoints
│       └── health.js    # Health check endpoint
├── serverless.yml       # Serverless Framework configuration
├── package.json         # Node.js dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- AWS account (for deployment)
- AWS CLI configured with credentials (for deployment)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install DynamoDB local (optional, for local testing):
```bash
npm run dynamodb:install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

## Development

### Local Development

Start the serverless offline server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Available Endpoints

#### Menu
- `GET /dev/menu` - Get menu items

#### Orders
- `POST /dev/orders` - Create new order
  ```json
  {
    "items": [...],
    "totalPrice": 50.00,
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }
  ```
- `GET /dev/orders` - Get all orders
- `GET /dev/orders/{id}` - Get specific order
- `PUT /dev/orders/{id}` - Update order
- `DELETE /dev/orders/{id}` - Delete order

#### Health
- `GET /dev/health` - Check API health

## Deployment

### Deploy to AWS

1. Configure AWS credentials:
```bash
aws configure
```

2. Deploy the service:
```bash
npm run deploy
```

3. For production deployment:
```bash
serverless deploy --stage prod
```

## Configuration

Edit `serverless.yml` to customize:
- AWS region
- Lambda runtime version
- Environment variables
- Function timeouts
- Memory allocation
- DynamoDB tables

## Available Scripts

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to AWS
- `npm run dynamodb:install` - Install DynamoDB local
- `npm run dynamodb:start` - Start DynamoDB local
- `npm run lint` - Run ESLint
- `npm start` - Start offline server

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, modify the `serverless.yml` or use:
```bash
serverless offline start --httpPort 3001
```

### DynamoDB Connection Issues
Make sure DynamoDB local is running:
```bash
npm run dynamodb:start
```

### AWS Credentials Error
Verify AWS credentials are configured:
```bash
aws configure
```

## Next Steps

1. Connect to DynamoDB for persistent storage
2. Add authentication (API Key, JWT, etc.)
3. Add input validation
4. Add comprehensive error handling
5. Add unit and integration tests
6. Set up CI/CD pipeline
7. Add request/response logging
8. Implement rate limiting

## License

ISC

## Author

Restaurant Website Team
