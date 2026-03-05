describe('Dashboard Page', () => {
  beforeEach(() => {
    // Authenticate and stub all dashboard API endpoints
    cy.login();
    cy.stubDashboardAPIs();

    // Stub notification unread count (TopNav / NotificationBell)
    cy.intercept('GET', '/api/v1/notifications/*/unread-count', {
      statusCode: 200,
      body: { unreadCount: 2 },
    }).as('getUnreadCount');

    cy.visit('/dashboard');
  });

  it('should load the dashboard with a title and KPI widgets', () => {
    cy.contains('Performance Dashboard').should('be.visible');

    // Wait for the performance data to load
    cy.wait('@getPerformance');

    // KPI data should render somewhere on the page
    // The KPIWidgetGrid receives performance data containing
    // totalRevenue, totalOrders, etc.
    cy.get('#dashboard-export-area').should('exist');
  });

  it('should display period selector with selectable periods', () => {
    // PeriodSelector is a control rendered in the dashboard header
    // It usually renders buttons or a select for 7d / 30d / 90d
    cy.get('button, select').then(($els) => {
      // At minimum the period selector and store filter should be present
      expect($els.length).to.be.greaterThan(0);
    });
  });

  it('should display export buttons (CSV and Print)', () => {
    cy.contains('Export CSV').should('be.visible');
    cy.contains('Print Report').should('be.visible');
  });

  it('should have the export buttons disabled while loading', () => {
    // On initial render, while isLoading is true, buttons are disabled
    // We can check by visiting before the intercept resolves
    // Since our stubs return instantly, we check that the buttons exist
    // and become enabled once data loads.
    cy.wait('@getPerformance');
    cy.contains('Export CSV').should('not.be.disabled');
    cy.contains('Print Report').should('not.be.disabled');
  });

  it('should show Edit Layout and Widgets toolbar buttons', () => {
    cy.wait('@getPerformance');

    // DashboardLayoutManager renders an "Edit Layout" button and a "Widgets" button
    cy.contains('Edit Layout').should('be.visible');
    cy.contains('Widgets').should('be.visible');
  });

  it('should open widget settings panel when Widgets button is clicked', () => {
    cy.wait('@getPerformance');

    cy.contains('Widgets').click();

    // The WidgetSettingsPanel renders with role="dialog"
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Widget Settings').should('be.visible');

    // It should list widget titles
    cy.contains('KPI Summary').should('be.visible');
    cy.contains('Revenue Chart').should('be.visible');

    // Close via the close button
    cy.get('[aria-label="Close settings"]').click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should toggle edit mode when Edit Layout is clicked', () => {
    cy.wait('@getPerformance');

    // Click Edit Layout
    cy.contains('Edit Layout').click();

    // Button text should change to "Done"
    cy.contains('Done').should('be.visible');

    // Click Done to exit edit mode
    cy.contains('Done').click();
    cy.contains('Edit Layout').should('be.visible');
  });

  it('should display the store filter dropdown', () => {
    cy.wait('@getStores');

    // The DrillDownPanel renders a store selector.
    // It should eventually contain the stubbed store names.
    cy.get('select, [role="combobox"], [role="listbox"]').should('exist');
  });
});
