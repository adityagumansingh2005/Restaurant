const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

const params = {
  TableName: 'restaurant-api-reservations-dev',
  IndexName: 'userIdIndex',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: {
    ':userId': 'e408b488-0081-70b0-204f-1bbd4155999f'
  }
};

console.log('📊 Querying DynamoDB for reservations...\n');

dynamodb.query(params, (err, data) => {
  if (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Reservations found:', data.Items.length);
    data.Items.forEach((item, index) => {
      console.log('\nReservation ' + (index + 1) + ':');
      console.log(JSON.stringify(item, null, 2));
    });
    process.exit(0);
  }
});
