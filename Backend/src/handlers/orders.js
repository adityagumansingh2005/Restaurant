'use strict';

const orders = require('../utils/orders');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/**
 * Extract userId from Cognito JWT (supports both Lambda httpApi JWT & local app.js)
 */
function extractUser(event) {
  const jwt = event.requestContext?.authorizer?.jwt;
  const claims = event.requestContext?.authorizer?.claims;

  const userId =
    jwt?.claims?.sub ||
    claims?.sub ||
    event.requestContext?.authorizer?.userId ||
    event.requestContext?.authorizer?.principalId ||
    null;

  const userEmail =
    jwt?.claims?.email ||
    claims?.email ||
    '';

  return { userId, userEmail };
}

/* ------------------------------------------------------------------ */
/*  CREATE                                                             */
/* ------------------------------------------------------------------ */
module.exports.createOrder = async (event) => {
  console.log('POST /orders - Creating new order');

  try {
    const { userId, userEmail } = extractUser(event);

    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Authentication required' }), headers: HEADERS };
    }

    const body = JSON.parse(event.body || '{}');

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Order must contain at least one item' }), headers: HEADERS };
    }

    // Calculate total server-side for integrity
    const totalPrice = body.items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);

    const order = await orders.createOrder({
      userId,
      userEmail,
      items: body.items,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      customerName: body.customerName || '',
      customerEmail: body.customerEmail || userEmail,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: order }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};

/* ------------------------------------------------------------------ */
/*  GET ALL (user's orders)                                            */
/* ------------------------------------------------------------------ */
module.exports.getOrders = async (event) => {
  console.log('GET /orders - Fetching user orders');

  try {
    const { userId } = extractUser(event);

    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Authentication required' }), headers: HEADERS };
    }

    const items = await orders.getOrdersByUser(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: items, count: items.length }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};

/* ------------------------------------------------------------------ */
/*  GET ONE                                                            */
/* ------------------------------------------------------------------ */
module.exports.getOrder = async (event) => {
  console.log('GET /orders/:id');

  try {
    const { id } = event.pathParameters || {};
    const item = await orders.getOrderById(id);

    if (!item) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Order not found' }), headers: HEADERS };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: item }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};

/* ------------------------------------------------------------------ */
/*  UPDATE                                                             */
/* ------------------------------------------------------------------ */
module.exports.updateOrder = async (event) => {
  console.log('PUT /orders/:id');

  try {
    const { userId } = extractUser(event);
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Authentication required' }), headers: HEADERS };
    }

    const { id } = event.pathParameters || {};
    const existing = await orders.getOrderById(id);

    if (!existing) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Order not found' }), headers: HEADERS };
    }

    const body = JSON.parse(event.body || '{}');
    const allowedFields = ['status', 'items', 'totalPrice', 'customerName', 'customerEmail'];
    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (Object.keys(updateData).length === 0) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'No valid fields to update' }), headers: HEADERS };
    }

    const updated = await orders.updateOrder(id, updateData);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: updated }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error updating order:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE                                                             */
/* ------------------------------------------------------------------ */
module.exports.deleteOrder = async (event) => {
  console.log('DELETE /orders/:id');

  try {
    const { userId } = extractUser(event);
    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Authentication required' }), headers: HEADERS };
    }

    const { id } = event.pathParameters || {};
    const existing = await orders.getOrderById(id);

    if (!existing) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Order not found' }), headers: HEADERS };
    }

    await orders.deleteOrder(id);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Order deleted successfully' }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};
