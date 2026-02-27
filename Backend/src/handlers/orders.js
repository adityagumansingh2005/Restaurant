'use strict';

const { v4: uuidv4 } = require('uuid');

// In-memory storage for demo (replace with DynamoDB in production)
const orders = {};

module.exports.createOrder = async (event) => {
  console.log('POST /orders - Creating new order');

  try {
    const body = JSON.parse(event.body);
    
    // ✅ Extract userId from Cognito authorizer context
    const authorizer = event.requestContext?.authorizer;
    const userId = authorizer?.claims?.sub || authorizer?.principalId || event.requestContext?.authorizer?.userId;
    const userEmail = authorizer?.claims?.email || '';

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    const orderId = uuidv4();
    
    const order = {
      id: orderId,
      userId,
      userEmail,
      items: body.items,
      totalPrice: body.totalPrice,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    orders[orderId] = order;

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        data: order
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create order'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

module.exports.getOrders = async (event) => {
  console.log('GET /orders - Fetching all orders');

  try {
    const ordersList = Object.values(orders);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: ordersList,
        count: ordersList.length
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch orders'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

module.exports.getOrder = async (event) => {
  console.log('GET /orders/{id} - Fetching order:', event.pathParameters.id);

  try {
    const orderId = event.pathParameters.id;
    const order = orders[orderId];

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: order
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch order'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

module.exports.updateOrder = async (event) => {
  console.log('PUT /orders/{id} - Updating order:', event.pathParameters.id);

  try {
    const orderId = event.pathParameters.id;
    const body = JSON.parse(event.body);
    
    // ✅ Extract userId from Cognito authorizer context
    const authorizer = event.requestContext?.authorizer;
    const userId = authorizer?.claims?.sub || authorizer?.principalId || event.requestContext?.authorizer?.userId;

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    if (!orders[orderId]) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    const updatedOrder = {
      ...orders[orderId],
      ...body,
      id: orderId,
      userId: orders[orderId].userId,
      updatedAt: new Date().toISOString()
    };

    orders[orderId] = updatedOrder;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: updatedOrder
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error updating order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update order'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};

module.exports.deleteOrder = async (event) => {
  console.log('DELETE /orders/{id} - Deleting order:', event.pathParameters.id);

  try {
    // ✅ Extract userId from Cognito authorizer context
    const authorizer = event.requestContext?.authorizer;
    const userId = authorizer?.claims?.sub || authorizer?.principalId || event.requestContext?.authorizer?.userId;

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }
    const orderId = event.pathParameters.id;

    if (!orders[orderId]) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Order not found'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    delete orders[orderId];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Order deleted successfully'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    console.error('Error deleting order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to delete order'
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
