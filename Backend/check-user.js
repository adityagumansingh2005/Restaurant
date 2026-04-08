const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

const email = process.argv[2];
if (!email) {
  console.log('Usage: node check-user.js <email>');
  process.exit(1);
}

const params = {
  TableName: 'restaurant-api-users-dev',
  Key: { email }
};

console.log('📊 Querying DynamoDB for user...\n');

dynamodb.get(params, (err, data) => {
  if (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  } else {
    if (data.Item) {
      console.log('✅ User found in DynamoDB!');
      console.log(JSON.stringify(data.Item, null, 2));
    } else {
      console.log('⚠️ User not found in DynamoDB');
    }
    process.exit(0);
  }
});
