const nodemailer = require('nodemailer');
const { logger } = require('@retail-insight/shared');
const emailTemplates = require('../templates/emailTemplates');

/**
 * Creates a nodemailer transporter for production SMTP delivery.
 * Returns null if SMTP is not configured (dev mode).
 *
 * @returns {import('nodemailer').Transporter|null}
 */
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
  return null;
};

/**
 * Email delivery service for sending notification emails.
 * In dev mode (no SMTP configured), emails are logged but not sent.
 */
const emailDeliveryService = {
  /**
   * Send a notification as an email.
   *
   * @param {string} email - Recipient email address
   * @param {{ type: string, title: string, message: string, metadata?: object|string }} notification
   * @returns {Promise<{ sent: boolean, devMode?: boolean, error?: string }>}
   */
  async sendNotificationEmail(email, notification) {
    const { type, title, message, metadata } = notification;

    // Select template based on type, falling back to generic
    const templateFn = emailTemplates[type] || emailTemplates.generic;
    const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    const html = templateFn({ title, message, metadata: parsedMetadata });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@optisight.ai',
      to: email,
      subject: `OptiSight: ${title}`,
      html,
    };

    const transporter = createTransporter();
    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
        logger.info({ message: 'Notification email sent', email, type, title });
        return { sent: true };
      } catch (err) {
        logger.error({ message: 'Failed to send notification email', email, error: err.message });
        return { sent: false, error: err.message };
      }
    } else {
      logger.info({ message: 'Email delivery (dev mode)', email, type, title });
      return { sent: false, devMode: true };
    }
  },
};

module.exports = emailDeliveryService;
