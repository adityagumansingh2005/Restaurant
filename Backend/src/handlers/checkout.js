'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');
const orders = require('../utils/orders');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function extractUser(event) {
  const jwt = event.requestContext?.authorizer?.jwt;
  const claims = event.requestContext?.authorizer?.claims;
  const userId = jwt?.claims?.sub || claims?.sub || event.requestContext?.authorizer?.userId || event.requestContext?.authorizer?.principalId || null;
  const userEmail = jwt?.claims?.email || claims?.email || '';
  return { userId, userEmail };
}

module.exports.createCheckoutSession = async (event) => {
  console.log('POST /checkout/session - Creating Stripe session');

  try {
    const { userId, userEmail } = extractUser(event);

    if (!userId) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Authentication required' }), headers: HEADERS };
    }

    const body = JSON.parse(event.body || '{}');

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Cart is empty' }), headers: HEADERS };
    }

    // 1. Create a draft order in our database first (status: pending_payment)
    const totalPrice = body.items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const order = await orders.createOrder({
      userId,
      userEmail,
      items: body.items,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      status: 'pending_payment',
    });

    // Determine base URL dynamically based on event headers or env variable
    const frontendUrl = process.env.FRONTEND_URL || 
                        (event.headers?.origin || event.headers?.Origin) || 
                        'http://localhost:3000';

    // 2. Map items to Stripe line_items format
    const lineItems = body.items.map(item => {
      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: item.name,
          },
          // Stripe expects amounts in the smallest currency unit (paise for INR)
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendUrl}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.orderId}`,
      cancel_url: `${frontendUrl}/?cart=open`,
      client_reference_id: order.orderId,
      customer_email: userEmail || undefined,
      metadata: {
        orderId: order.orderId,
        userId: userId,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sessionId: session.id, url: session.url }),
      headers: HEADERS,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};

module.exports.confirmPayment = async (event) => {
  try {
    const { orderId } = JSON.parse(event.body || '{}');
    if (!orderId) {
       return { statusCode: 400, body: JSON.stringify({ success: false }), headers: HEADERS };
    }
    
    // In a real app we'd verify the Stripe session here or use webhooks.
    // For now, allow frontend to confirm after success redirect.
    await orders.updateOrder(orderId, { status: 'confirmed' });
    
    return { statusCode: 200, body: JSON.stringify({ success: true }), headers: HEADERS };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }), headers: HEADERS };
  }
};
