/**
 * ✅ Reservation Handlers - Uses Cognito Authorizer
 */

// Always use real DynamoDB in development for persistent storage
const reservations = require('../utils/reservations');

module.exports.createReservation = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // ✅ Extract userId from both local (app.js) and AWS Lambda (httpApi JWT) formats
    let userId = null;
    
    // AWS Lambda httpApi JWT format
    const jwt = event.requestContext?.authorizer?.jwt;
    if (jwt?.claims?.sub) {
      userId = jwt.claims.sub;
    }
    // Local app.js format
    else if (event.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    }
    // Fallback to userId if directly provided
    else if (event.requestContext?.authorizer?.userId) {
      userId = event.requestContext.authorizer.userId;
    }
    
    const userEmail = jwt?.claims?.email || event.requestContext?.authorizer?.claims?.email || '';
    
    const { name, dateTime, partySize, phone } = body;

    if (!userId || !dateTime || !partySize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Authenticated user, dateTime and partySize are required' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    const item = await reservations.createReservation({ 
      userId, 
      userEmail,
      name: name || '', 
      dateTime, 
      partySize, 
      phone: phone || '' 
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: item }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    };
  } catch (error) {
    console.error('createReservation error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  }
};

module.exports.getReservations = async (event) => {
  try {
    // ✅ Extract userId from both local and AWS Lambda JWT formats
    let userId = null;
    const jwt = event.requestContext?.authorizer?.jwt;
    if (jwt?.claims?.sub) {
      userId = jwt.claims.sub;
    } else if (event.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    } else if (event.requestContext?.authorizer?.userId) {
      userId = event.requestContext.authorizer.userId;
    }
    
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    // Get user's reservations
    const items = await reservations.getReservationsByUser(userId);
    return { statusCode: 200, body: JSON.stringify({ success: true, data: items }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  } catch (error) {
    console.error('getReservations error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  }
};

module.exports.getReservation = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const item = await reservations.getReservationById(id);
    if (!item) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Reservation not found' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: item }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  } catch (error) {
    console.error('getReservation error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  }
};

module.exports.updateReservation = async (event) => {
  try {
    // ✅ Extract userId from both local and AWS Lambda JWT formats
    let userId = null;
    const jwt = event.requestContext?.authorizer?.jwt;
    if (jwt?.claims?.sub) {
      userId = jwt.claims.sub;
    } else if (event.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    } else if (event.requestContext?.authorizer?.userId) {
      userId = event.requestContext.authorizer.userId;
    }
    
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const updated = await reservations.updateReservation(id, body);
    if (!updated) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Reservation not found' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: updated }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  } catch (error) {
    console.error('updateReservation error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  }
};

module.exports.deleteReservation = async (event) => {
  try {
    // ✅ Extract userId from both local and AWS Lambda JWT formats
    let userId = null;
    const jwt = event.requestContext?.authorizer?.jwt;
    if (jwt?.claims?.sub) {
      userId = jwt.claims.sub;
    } else if (event.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    } else if (event.requestContext?.authorizer?.userId) {
      userId = event.requestContext.authorizer.userId;
    }
    
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      };
    }

    const { id } = event.pathParameters || {};
    const ok = await reservations.deleteReservation(id);
    if (!ok) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Reservation not found' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Deleted' }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  } catch (error) {
    console.error('deleteReservation error', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } };
  }
};
