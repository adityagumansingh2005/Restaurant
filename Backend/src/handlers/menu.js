'use strict';

module.exports.getMenu = async (event) => {
  console.log('GET /menu - Fetching menu items');

  try {
    // Sample menu data - replace with DynamoDB query
    const menu = {
      appetizers: [
        { id: 1, name: 'Spring Rolls', price: 5.99 },
        { id: 2, name: 'Bruschetta', price: 6.99 }
      ],
      mains: [
        { id: 3, name: 'Grilled Salmon', price: 18.99 },
        { id: 4, name: 'Ribeye Steak', price: 22.99 }
      ],
      desserts: [
        { id: 5, name: 'Chocolate Cake', price: 7.99 },
        { id: 6, name: 'Tiramisu', price: 8.99 }
      ]
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: menu
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch menu'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
