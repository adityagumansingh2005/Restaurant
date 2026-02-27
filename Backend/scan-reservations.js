const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();

const params = {
  TableName: 'restaurant-api-reservations-dev'
};

console.log('📊 Scanning all reservations in DynamoDB...\n');

dynamodb.scan(params, (err, data) => {
  if (err) {
    console.log('❌ Error:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Total reservations found:', data.Items.length);
    if (data.Items.length > 0) {
      data.Items.forEach((item, index) => {
        console.log('\nReservation ' + (index + 1) + ':');
        console.log(JSON.stringify(item, null, 2));
      });
    } else {
      console.log('No reservations in the table.');
    }
    process.exit(0);
  }
});
