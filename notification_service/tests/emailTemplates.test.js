const emailTemplates = require('../src/templates/emailTemplates');

describe('emailTemplates', () => {
  // ──────────────────────────────────────────────────────────────
  // anomalyAlert
  // ──────────────────────────────────────────────────────────────

  describe('anomalyAlert', () => {
    it('should return an HTML string containing title and message', () => {
      const html = emailTemplates.anomalyAlert({
        title: 'Sales Drop',
        message: 'Revenue fell 15% below forecast.',
        metadata: { deviation: 15, amount: 3200 },
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Sales Drop');
      expect(html).toContain('Revenue fell 15% below forecast.');
      expect(html).toContain('Revenue Anomaly Detected');
    });

    it('should include deviation and amount when provided in metadata', () => {
      const html = emailTemplates.anomalyAlert({
        title: 'Alert',
        message: 'Test',
        metadata: { deviation: 22, amount: 5000 },
      });

      expect(html).toContain('22%');
      expect(html).toContain('$5000');
    });

    it('should handle missing metadata gracefully', () => {
      const html = emailTemplates.anomalyAlert({
        title: 'Alert',
        message: 'No metadata.',
        metadata: null,
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Alert');
      expect(html).toContain('No metadata.');
      // Should not contain deviation or amount blocks
      expect(html).not.toContain('Deviation:');
      expect(html).not.toContain('Amount:');
    });

    it('should handle undefined metadata gracefully', () => {
      const html = emailTemplates.anomalyAlert({
        title: 'Alert',
        message: 'Undefined metadata.',
        metadata: undefined,
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Alert');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // inventoryAlert
  // ──────────────────────────────────────────────────────────────

  describe('inventoryAlert', () => {
    it('should return an HTML string containing title and message', () => {
      const html = emailTemplates.inventoryAlert({
        title: 'Low Stock',
        message: 'Widget supply is critically low.',
        metadata: { currentLevel: 3, reorderPoint: 10 },
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Low Stock');
      expect(html).toContain('Widget supply is critically low.');
      expect(html).toContain('Inventory Alert');
    });

    it('should include currentLevel and reorderPoint when provided', () => {
      const html = emailTemplates.inventoryAlert({
        title: 'Low Stock',
        message: 'Reorder needed.',
        metadata: { currentLevel: 5, reorderPoint: 20 },
      });

      expect(html).toContain('5');
      expect(html).toContain('20');
      expect(html).toContain('Current Level:');
      expect(html).toContain('Reorder Point:');
    });

    it('should handle currentLevel of 0 correctly', () => {
      const html = emailTemplates.inventoryAlert({
        title: 'Out of Stock',
        message: 'No stock remaining.',
        metadata: { currentLevel: 0 },
      });

      expect(html).toContain('Current Level:');
      expect(html).toContain('0');
    });

    it('should handle missing metadata gracefully', () => {
      const html = emailTemplates.inventoryAlert({
        title: 'Low Stock',
        message: 'No details.',
        metadata: null,
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Low Stock');
      expect(html).not.toContain('Current Level:');
      expect(html).not.toContain('Reorder Point:');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // weeklyDigest
  // ──────────────────────────────────────────────────────────────

  describe('weeklyDigest', () => {
    it('should return an HTML string containing title and message', () => {
      const html = emailTemplates.weeklyDigest({
        title: 'Week 10 Summary',
        message: 'Here is your weekly performance digest.',
        metadata: { items: ['Revenue up 5%', '3 anomalies detected'] },
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Week 10 Summary');
      expect(html).toContain('Here is your weekly performance digest.');
      expect(html).toContain('Weekly Performance Digest');
    });

    it('should render list items from metadata.items', () => {
      const html = emailTemplates.weeklyDigest({
        title: 'Digest',
        message: 'Summary.',
        metadata: { items: ['Item A', 'Item B', 'Item C'] },
      });

      expect(html).toContain('<li');
      expect(html).toContain('Item A');
      expect(html).toContain('Item B');
      expect(html).toContain('Item C');
    });

    it('should handle empty items array', () => {
      const html = emailTemplates.weeklyDigest({
        title: 'Digest',
        message: 'No items.',
        metadata: { items: [] },
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Digest');
      expect(html).not.toContain('<li');
    });

    it('should handle missing metadata gracefully', () => {
      const html = emailTemplates.weeklyDigest({
        title: 'Digest',
        message: 'No metadata.',
        metadata: null,
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Digest');
      expect(html).not.toContain('<li');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // generic
  // ──────────────────────────────────────────────────────────────

  describe('generic', () => {
    it('should return an HTML string containing title and message', () => {
      const html = emailTemplates.generic({
        title: 'General Notice',
        message: 'You have a new notification.',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('General Notice');
      expect(html).toContain('You have a new notification.');
      expect(html).toContain('OptiSight AI');
    });

    it('should include the automated notification footer', () => {
      const html = emailTemplates.generic({
        title: 'Test',
        message: 'Test message.',
      });

      expect(html).toContain('automated notification from OptiSight AI');
    });
  });
});
