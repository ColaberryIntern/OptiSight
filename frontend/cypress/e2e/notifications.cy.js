describe('Notifications Page', () => {
  describe('with notifications', () => {
    beforeEach(() => {
      cy.login();
      cy.stubDashboardAPIs();
      cy.stubNotificationAPIs();

      cy.visit('/notifications');
    });

    it('should display the page title', () => {
      cy.contains('Notifications').should('be.visible');
    });

    it('should render the list of notifications', () => {
      cy.wait('@getNotifications');

      // Three stubbed notifications
      cy.contains('Revenue Alert').should('be.visible');
      cy.contains('Inventory Warning').should('be.visible');
      cy.contains('System Update').should('be.visible');
    });

    it('should display notification message text', () => {
      cy.wait('@getNotifications');

      cy.contains('Daily revenue exceeded target by 20%').should('be.visible');
      cy.contains('Organic Milk stock is below reorder point').should('be.visible');
    });

    it('should mark an unread notification as read on click', () => {
      cy.wait('@getNotifications');

      // Click the first unread notification ("Revenue Alert")
      cy.contains('Revenue Alert').click();

      // Should fire the mark-as-read PATCH
      cy.wait('@markNotificationRead').its('request.url').should('include', '/read');
    });

    it('should not fire mark-as-read for an already-read notification', () => {
      cy.wait('@getNotifications');

      // "Inventory Warning" is already read in our fixture (read: true).
      // Clicking it should NOT fire the PATCH endpoint.
      // We track whether the intercept is hit by using a spy.
      let patchCalled = false;
      cy.intercept('PATCH', '/api/v1/notifications/*/read', () => {
        patchCalled = true;
      }).as('markReadSpy');

      cy.contains('Inventory Warning').click();

      // Give a short window for the request to fire (it should not)
      cy.wait(500).then(() => {
        expect(patchCalled).to.be.false;
      });
    });
  });

  describe('with empty notifications', () => {
    beforeEach(() => {
      cy.login();
      cy.stubDashboardAPIs();
      cy.stubNotificationAPIs([]);

      cy.visit('/notifications');
    });

    it('should show the empty state when there are no notifications', () => {
      cy.wait('@getNotifications');

      cy.contains('No notifications yet').should('be.visible');
    });
  });
});
