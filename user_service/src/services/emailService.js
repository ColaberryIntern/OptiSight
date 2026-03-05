const nodemailer = require('nodemailer');
const { logger } = require('@retail-insight/shared');

// In development, use Ethereal (fake SMTP) or just log emails
// In production, use real SMTP settings
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Development: log emails instead of sending
  return null;
};

const emailService = {
  async sendVerificationEmail(email, token) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost';
    const verifyUrl = `${baseUrl}/api/v1/users/verify-email/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@optisight.ai',
      to: email,
      subject: 'Verify your OptiSight account',
      html: `
        <h2>Welcome to OptiSight AI</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1A73E8;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a>
        <p>Or copy this link: ${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
      `,
    };

    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info({ message: 'Verification email sent', email });
    } else {
      // Development mode: just log the verification URL
      logger.info({ message: 'Verification email (dev mode)', email, verifyUrl });
    }
  },

  async sendNotificationEmail(email, subject, htmlContent) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@optisight.ai',
      to: email,
      subject,
      html: htmlContent,
    };

    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail(mailOptions);
      logger.info({ message: 'Notification email sent', email, subject });
    } else {
      logger.info({ message: 'Email (dev mode)', email, subject });
    }
  },
};

module.exports = emailService;
