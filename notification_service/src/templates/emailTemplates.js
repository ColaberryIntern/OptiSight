/**
 * Email templates for notification delivery.
 * Each template function accepts { title, message, metadata } and returns an HTML string.
 */
const emailTemplates = {
  anomalyAlert({ title, message, metadata }) {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#D32F2F;color:#fff;padding:16px 24px;border-radius:4px 4px 0 0;">
          <h2 style="margin:0;">⚠ Revenue Anomaly Detected</h2>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:0;border-radius:0 0 4px 4px;">
          <h3 style="color:#333;">${title}</h3>
          <p style="color:#666;">${message}</p>
          ${metadata && metadata.deviation ? `<p><strong>Deviation:</strong> ${metadata.deviation}%</p>` : ''}
          ${metadata && metadata.amount ? `<p><strong>Amount:</strong> $${metadata.amount}</p>` : ''}
          <hr style="border:0;border-top:1px solid #eee;margin:16px 0;">
          <p style="color:#999;font-size:12px;">This is an automated alert from OptiSight AI.</p>
        </div>
      </div>
    `;
  },

  inventoryAlert({ title, message, metadata }) {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#F57C00;color:#fff;padding:16px 24px;border-radius:4px 4px 0 0;">
          <h2 style="margin:0;">📦 Inventory Alert</h2>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:0;border-radius:0 0 4px 4px;">
          <h3 style="color:#333;">${title}</h3>
          <p style="color:#666;">${message}</p>
          ${metadata && metadata.currentLevel !== undefined ? `<p><strong>Current Level:</strong> ${metadata.currentLevel}</p>` : ''}
          ${metadata && metadata.reorderPoint ? `<p><strong>Reorder Point:</strong> ${metadata.reorderPoint}</p>` : ''}
          <hr style="border:0;border-top:1px solid #eee;margin:16px 0;">
          <p style="color:#999;font-size:12px;">This is an automated alert from OptiSight AI.</p>
        </div>
      </div>
    `;
  },

  weeklyDigest({ title, message, metadata }) {
    const items = metadata && metadata.items ? metadata.items : [];
    const itemsHtml = items.map(item => `<li style="margin:4px 0;">${item}</li>`).join('');
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A73E8;color:#fff;padding:16px 24px;border-radius:4px 4px 0 0;">
          <h2 style="margin:0;">📊 Weekly Performance Digest</h2>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:0;border-radius:0 0 4px 4px;">
          <h3 style="color:#333;">${title}</h3>
          <p style="color:#666;">${message}</p>
          ${itemsHtml ? `<ul style="padding-left:20px;">${itemsHtml}</ul>` : ''}
          <hr style="border:0;border-top:1px solid #eee;margin:16px 0;">
          <p style="color:#999;font-size:12px;">This is an automated report from OptiSight AI.</p>
        </div>
      </div>
    `;
  },

  generic({ title, message }) {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A73E8;color:#fff;padding:16px 24px;border-radius:4px 4px 0 0;">
          <h2 style="margin:0;">OptiSight AI</h2>
        </div>
        <div style="padding:24px;border:1px solid #ddd;border-top:0;border-radius:0 0 4px 4px;">
          <h3 style="color:#333;">${title}</h3>
          <p style="color:#666;">${message}</p>
          <hr style="border:0;border-top:1px solid #eee;margin:16px 0;">
          <p style="color:#999;font-size:12px;">This is an automated notification from OptiSight AI.</p>
        </div>
      </div>
    `;
  },
};

module.exports = emailTemplates;
