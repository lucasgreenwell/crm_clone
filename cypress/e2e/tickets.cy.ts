describe("Ticket Operations", () => {
  describe("Customer Tickets", () => {
    beforeEach(() => {
      cy.loginAsCustomer()
      cy.visit('/customer/tickets')
    })

    it("should display the tickets page", () => {
      cy.contains('My Tickets').should('be.visible')
      cy.get('button').contains('Create New Ticket').should('be.visible')
    })

    it("should show loading state initially", () => {
      cy.contains('Loading tickets...').should('be.visible')
    })

    it("should display empty state when no tickets", () => {
      // Intercept the tickets query and return empty array
      cy.intercept('GET', '**/rest/v1/tickets?*', {
        statusCode: 200,
        body: []
      }).as('getTickets')
      
      cy.visit('/customer/tickets')
      cy.wait('@getTickets')
      
      cy.get('[data-testid="empty-state"]', { timeout: 10000 }).should('exist')
      cy.get('[data-testid="empty-state"]').should('contain', 'Create a new ticket to get started')
    })

    it("should create, update, and delete a ticket", () => {
      // Create ticket
      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Test Ticket')
      cy.get('textarea[name="description"]').type('Test Description')
      cy.get('button[type="submit"]').click()

      // Verify ticket was created
      cy.contains('Test Ticket').should('be.visible')
      cy.contains('Test Description').should('be.visible')

      // Edit ticket
      cy.get('[data-testid="ticket-card"]').first().click({ force: true })
      cy.wait(2000) // Wait longer for modal to open and render
      cy.get('[data-testid="edit-subject"]', { timeout: 10000 }).should('be.visible').first().click({ force: true })
      cy.get('[data-testid="edit-subject-input"]', { timeout: 10000 }).should('be.visible').first().clear({ force: true }).type('Updated Test Ticket')
      cy.get('[data-testid="save-subject-button"]').should('be.visible').first().click({ force: true })
      cy.contains('Updated Test Ticket').should('be.visible')

      // Delete ticket
      cy.get('[data-testid="delete-button"]').first().click({ force: true })
      cy.get('button').contains('Delete').first().click({ force: true })
      cy.contains('Updated Test Ticket').should('not.exist')
    })

    it("should validate required fields in create modal", () => {
      cy.get('button').contains('Create New Ticket').click()
      cy.get('button[type="submit"]').click()
      cy.contains('This field is required').should('be.visible')
    })

    it("should handle API errors gracefully in create modal", () => {
      // Intercept the create ticket request and force it to fail
      cy.intercept('POST', '/api/tickets', {
        statusCode: 500,
        body: 'Server error',
      })

      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Test Ticket')
      cy.get('textarea[name="description"]').type('Test Description')
      cy.get('button[type="submit"]').click()

      cy.contains('Failed to create ticket').should('be.visible')
    })

    it('should allow filtering tickets', () => {
      // Create a ticket first
      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Test Filter Ticket')
      cy.get('textarea[name="description"]').type('Test Description')
      cy.get('button[type="submit"]').click()

      // Test search filter
      cy.get('input[placeholder="Search tickets..."]').type('Filter')
      cy.contains('Test Filter Ticket').should('be.visible')
      cy.get('input[placeholder="Search tickets..."]').clear().type('Nonexistent')
      cy.contains('Test Filter Ticket').should('not.exist')
    })

    it('should show appropriate message when no tickets match filters', () => {
      cy.get('input[placeholder="Search tickets..."]').type('Nonexistent Ticket')
      cy.contains('Try adjusting your filters').should('be.visible')
    })
  })

  describe("Employee Tickets", () => {
    beforeEach(() => {
      cy.loginAsEmployee()
      cy.visit('/employee/tickets')
    })

    it("should create, update, and delete ticket from tickets page", () => {
      // Create ticket
      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Employee Test Ticket')
      cy.get('textarea[name="description"]').type('Employee Test Description')
      cy.get('button[type="submit"]').click()

      // Verify ticket was created
      cy.contains('Employee Test Ticket').should('be.visible')
      cy.contains('Employee Test Description').should('be.visible')

      // Edit ticket
      cy.get('[data-testid="ticket-card"]').first().click({ force: true })
      cy.wait(2000) // Wait longer for modal to open and render
      cy.get('[data-testid="edit-subject"]', { timeout: 10000 }).should('be.visible').first().click({ force: true })
      cy.get('[data-testid="edit-subject-input"]', { timeout: 10000 }).should('be.visible').first().clear({ force: true }).type('Updated Employee Ticket')
      cy.get('[data-testid="save-subject-button"]', {timeout: 10000}).should('be.visible').first().click({ force: true })
      cy.contains('Updated Employee Ticket').should('be.visible')

      // Delete ticket
      cy.get('[data-testid="delete-button"]').first().click({ force: true })
      cy.get('button').contains('Delete').first().click({ force: true })
      cy.contains('Updated Employee Ticket').should('not.exist')
    })

    it("should update ticket status from the list view", () => {
      // Create a ticket first
      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Status Test Ticket')
      cy.get('textarea[name="description"]').type('Test Description')
      cy.get('button[type="submit"]').click()

      // Update status using the dropdown
      cy.contains('Status Test Ticket')
        .parents('[data-testid="ticket-card"]')
        .find('[data-testid="status-select"]')
        .click()
      cy.get('[data-testid="status-option-pending"]').click()
      cy.contains('Ticket status updated successfully').should('be.visible')
    })

    it("should handle status update errors gracefully", () => {
      // Create a ticket first
      cy.get('button').contains('Create New Ticket').click()
      cy.get('input[name="subject"]').type('Status Error Test')
      cy.get('textarea[name="description"]').type('Test Description')
      cy.get('button[type="submit"]').click()

      // Intercept status update and force it to fail
      cy.intercept('PATCH', '/api/tickets', {
        statusCode: 500,
        body: 'Server error',
      })

      cy.contains('Status Error Test')
        .parents('[data-testid="ticket-card"]')
        .find('[data-testid="status-select"]')
        .click()
      cy.get('[data-testid="status-option-pending"]').click()
      cy.contains('Failed to update ticket status').should('be.visible')
    })
  })
}) 