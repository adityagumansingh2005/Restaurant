/**
 * OTP (One-Time Password) Management Utility
 * Handles OTP generation, validation, and storage in DynamoDB
 */

const crypto = require('crypto');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1',
});

const OTP_TABLE = process.env.OTP_TABLE || 'restaurant-otp-codes-dev';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || 10, 10);
const OTP_LENGTH = 6; // 6-digit OTP
const SES_SENDER_EMAIL = process.env.SES_SENDER_EMAIL || 'noreply@restaurantdeliciousbites.com';

/**
 * Generate a random OTP code
 * @returns {string} 6-digit OTP code
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via email using AWS SES
 * @param {string} email - Recipient email address
 * @param {string} otp - OTP code to send
 * @returns {Promise<object>} SES response
 */
const sendOTPEmail = async (email, otp) => {
  const params = {
    Source: SES_SENDER_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '🔐 Your Restaurant Account OTP Code',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; text-align: center;">Delicious Bites</h2>
                <p style="color: #666; text-align: center;">Email Verification Code</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">Your verification code is:</p>
                  <div style="background-color: #f0f0f0; padding: 15px; border-radius: 6px; margin: 10px 0;">
                    <code style="font-size: 32px; font-weight: bold; color: #2c3e50; letter-spacing: 3px;">${otp}</code>
                  </div>
                  <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                    This code will expire in ${OTP_EXPIRY_MINUTES} minutes
                  </p>
                </div>
                
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                  If you didn't request this code, please ignore this email.
                </p>
                
                <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 20px;">
                  <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">
                    © 2026 Delicious Bites Restaurant. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          `,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `Your verification code is: ${otp}\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  return ses.sendEmail(params).promise();
};

/**
 * Store OTP in DynamoDB with TTL
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @param {object} userData - Additional user data to store (name, phone, etc)
 * @returns {Promise<void>}
 */
const storeOTP = async (email, otp, userData = {}) => {
  const expiryTime = Math.floor(Date.now() / 1000) + OTP_EXPIRY_MINUTES * 60;
  const createdAt = new Date().toISOString();

  const params = {
    TableName: OTP_TABLE,
    Item: {
      email, // Primary key
      otp,
      userData, // Store user registration data temporarily
      attempts: 0,
      maxAttempts: 5,
      createdAt,
      ttl: expiryTime, // DynamoDB TTL attribute (auto-deletes after expiry)
    },
  };

  return dynamodb.put(params).promise();
};

/**
 * Verify OTP code against stored OTP
 * @param {string} email - User email
 * @param {string} otpCode - OTP code to verify
 * @returns {Promise<object>} {valid: boolean, userData: object, message: string}
 */
const verifyOTP = async (email, otpCode) => {
  try {
    // Get OTP record from DynamoDB
    const params = {
      TableName: OTP_TABLE,
      Key: { email },
    };

    const result = await dynamodb.get(params).promise();
    const otpRecord = result.Item;

    // Check if OTP record exists
    if (!otpRecord) {
      return {
        valid: false,
        message: 'OTP not found or has expired',
      };
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return {
        valid: false,
        message: 'Maximum OTP verification attempts exceeded. Please request a new code.',
      };
    }

    // Check if OTP matches
    if (otpRecord.otp !== otpCode.toString()) {
      // Increment attempt counter
      await dynamodb.update({
        TableName: OTP_TABLE,
        Key: { email },
        UpdateExpression: 'SET attempts = attempts + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
      }).promise();

      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts - 1;
      return {
        valid: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      };
    }

    // OTP is valid - return user data and mark for deletion
    const userData = otpRecord.userData || {};

    // Delete OTP record after successful verification
    await dynamodb.delete({
      TableName: OTP_TABLE,
      Key: { email },
    }).promise();

    return {
      valid: true,
      userData,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      valid: false,
      message: 'Error verifying OTP. Please try again.',
    };
  }
};

/**
 * Send OTP and store user data
 * @param {string} email - User email
 * @param {object} userData - User registration data {name, phone}
 * @returns {Promise<object>} {success: boolean, message: string}
 */
const sendOTPToEmail = async (email, userData = {}) => {
  try {
    // Check if email already has a pending OTP
    const params = {
      TableName: OTP_TABLE,
      Key: { email },
    };

    const existingOTP = await dynamodb.get(params).promise();
    if (existingOTP.Item) {
      return {
        success: false,
        message: 'OTP already sent to this email. Please check your inbox.',
      };
    }

    // Generate new OTP
    const otp = generateOTP();
    console.log(`🔐 Generated OTP for ${email}: ${otp}`);

    // Send email
    await sendOTPEmail(email, otp);
    console.log(`📧 OTP email sent to ${email}`);

    // Store OTP in DynamoDB
    await storeOTP(email, otp, userData);
    console.log(`💾 OTP stored for ${email} with TTL`);

    return {
      success: true,
      message: `OTP sent to ${email}. Please check your email.`,
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
    };
  }
};

/**
 * Delete OTP record (for cleanup or manual cancellation)
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
const deleteOTP = async (email) => {
  const params = {
    TableName: OTP_TABLE,
    Key: { email },
  };

  return dynamodb.delete(params).promise();
};

/**
 * Resend OTP to same email
 * @param {string} email - User email
 * @returns {Promise<object>} {success: boolean, message: string}
 */
const resendOTP = async (email) => {
  try {
    // Get existing OTP record to get user data
    const params = {
      TableName: OTP_TABLE,
      Key: { email },
    };

    const result = await dynamodb.get(params).promise();
    if (!result.Item) {
      return {
        success: false,
        message: 'No OTP request found for this email. Start fresh signup.',
      };
    }

    const userData = result.Item.userData || {};

    // Delete old OTP
    await deleteOTP(email);

    // Send new OTP
    return sendOTPToEmail(email, userData);
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.',
    };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendOTPToEmail,
  storeOTP,
  verifyOTP,
  deleteOTP,
  resendOTP,
  OTP_EXPIRY_MINUTES,
};
