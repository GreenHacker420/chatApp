/**
 * Email templates for the application
 */

/**
 * Generate a verification email template
 * @param {string} userName - The user's name
 * @param {string} verificationUrl - The verification URL
 * @returns {Object} - The email template with subject, text and html
 */
export const getVerificationEmailTemplate = (userName, verificationUrl) => {
  const appName = "GutarGu";
  const subject = `${appName} - Verify Your Email Address`;

  // Plain text version for email clients that don't support HTML
  const text = `
    Hello ${userName},

    Thank you for signing up with ${appName}!

    Please verify your email address by clicking the link below:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you did not create an account, please ignore this email.

    Best regards,
    The ${appName} Team
  `;

  // HTML version with styling
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #4f46e5;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 24px 0;
          text-align: center;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25);
          transition: all 0.3s ease;
        }
        .button:hover {
          background-color: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(79, 70, 229, 0.3);
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
        }
        .note {
          font-size: 13px;
          color: #666;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${appName}</div>
        </div>
        <div class="content">
          <h2>Welcome to ${appName}!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for joining our community! To ensure the security of your account and to get started with all the features ${appName} has to offer, please verify your email address by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Email</a>
          </div>

          <p>If you're having trouble with the button above, you can also click on the link below or copy and paste it into your browser:</p>
          <p style="word-break: break-all;"><a href="${verificationUrl}">${verificationUrl}</a></p>

          <div class="note">
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you did not create an account with ${appName}, please disregard this email or contact our support team if you have concerns.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject,
    text,
    html
  };
};

/**
 * Generate a password reset email template
 * @param {string} userName - The user's name
 * @param {string} resetUrl - The password reset URL
 * @returns {Object} - The email template with subject, text and html
 */
export const getPasswordResetEmailTemplate = (userName, resetUrl) => {
  const appName = "GutarGu";
  const subject = `${appName} - Reset Your Password`;

  // Plain text version
  const text = `
    Hello ${userName},

    You recently requested to reset your password for your ${appName} account.

    Please click the link below to reset your password:
    ${resetUrl}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email or contact support if you have concerns.

    Best regards,
    The ${appName} Team
  `;

  // HTML version with styling
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #4f46e5;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 24px 0;
          text-align: center;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.25);
          transition: all 0.3s ease;
        }
        .button:hover {
          background-color: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(79, 70, 229, 0.3);
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
        }
        .note {
          font-size: 13px;
          color: #666;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${appName}</div>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset the password for your ${appName} account. To proceed with the password reset, please click the button below:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>

          <p>If you're having trouble with the button above, you can also click on the link below or copy and paste it into your browser:</p>
          <p style="word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>

          <div class="note">
            <p>For security reasons, this password reset link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please disregard this email. Your account security is important to us - if you believe this was a mistake or have any concerns, please contact our support team immediately.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject,
    text,
    html
  };
};
