const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Scan the table to see what keys it has
const params = {
  TableName: 'restaurant-api-users-dev',
  Limit: 5
};

console.log('📊 Scanning DynamoDB users table...\n');

dynamodb.scan(params, (err, data) => {
  if (err) {
    console.log('❌ Error:', err.message);
  } else {
    console.log('Total items:', data.Items.length);
    if (data.Items.length > 0) {
      console.log('\n✅ Sample user record:');
      console.log(JSON.stringify(data.Items[0], null, 2));
    } else {
      console.log('⚠️ No users in table yet');
    }
  }
  process.exit(0);
});
