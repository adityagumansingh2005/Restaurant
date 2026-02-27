'use strict';

module.exports.check = async (event) => {
  console.log('GET /health - Health check');

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };
};
