describe('Profile Page', () => {
  beforeEach(() => {
    cy.login();
    cy.stubDashboardAPIs();

    // Stub notification unread count (TopNav / NotificationBell)
    cy.intercept('GET', '/api/v1/notifications/*/unread-count', {
      statusCode: 200,
      body: { unreadCount: 0 },
    });

    cy.visit('/profile');
  });

  it('should display the profile page title', () => {
    cy.contains('Profile').should('be.visible');
  });

  it('should display the Account Information section', () => {
    cy.contains('Account Information').should('be.visible');
  });

  it('should display user email from the auth store', () => {
    // The login command seeds the user with email admin@optisight.io
    cy.contains('admin@optisight.io').should('be.visible');
  });

  it('should display user role', () => {
    cy.contains('admin').should('be.visible');
  });

  it('should display user ID', () => {
    cy.contains('user-e2e-001').should('be.visible');
  });

  it('should display the Quick Links section', () => {
    cy.contains('Quick Links').should('be.visible');
  });

  it('should navigate to Privacy & Data Settings from the quick link', () => {
    cy.contains('Privacy & Data Settings').click();
    cy.url().should('include', '/settings/privacy');
  });

  it('should navigate to Dashboard Preferences from the quick link', () => {
    cy.contains('Dashboard Preferences').click();
    cy.url().should('include', '/dashboard');
  });
});
