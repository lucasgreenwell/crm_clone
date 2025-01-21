describe("Ticket Operations", () => {
  describe("Customer Tickets", () => {
    beforeEach(() => {
      const email = Cypress.env('CUSTOMER_TEST_USER_EMAIL')
      const password = Cypress.env('CUSTOMER_TEST_USER_PASSWORD')
      
      // Login as customer
      cy.visit('/login')
      cy.get('input[type="email"]').should('be.visible').type(email)
      cy.get('input[type="password"]').should('be.visible').type(password)
      cy.get('button[type="submit"]').click()
      
      // Wait for redirect and page load
      cy.url().should('include', '/customer/tickets')
      cy.get('h1').contains('My Tickets').should('be.visible')
    })

    it("should display the tickets page", () => {
      cy.get('h1').contains('My Tickets').should('be.visible')
    })

    it("should show loading state initially", () => {
      cy.visit('/customer/tickets') // Force a fresh load
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
      
      cy.contains('No tickets found').should('be.visible')
      cy.contains('Create a new ticket to get started').should('be.visible')
    })

    it("should create, update, and delete a ticket", () => {
      // Click the create ticket button
      cy.contains("Create New Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Fill out the form
      cy.get("#subject").should('be.visible').clear().type("Test Ticket")
      cy.get("#description").should('be.visible').clear().type("This is a test ticket description")
      
      // Select priority - using a more specific selector
      cy.get("form").within(() => {
        cy.get("[role='combobox']").should('be.visible').click()
      })
      cy.get("[role='listbox']").should('be.visible').within(() => {
        cy.contains("Medium").click()
      })
      
      // Submit the form
      cy.get("form").within(() => {
        cy.contains("Create Ticket").should('be.visible').click()
      })
      
      // Should show success toast
      cy.contains("Ticket created successfully!").should("be.visible")
      
      // Modal should be closed
      cy.get("div[role='dialog']").should("not.exist")
      
      // New ticket should appear in the list
      cy.contains("Test Ticket").should("be.visible")

      // Update the ticket
      cy.get('button[aria-label="Ticket actions"]').first().click()
      cy.contains('Edit').click()
      cy.get('#subject').clear().type('Updated Test Ticket')
      cy.get('form').within(() => {
        cy.contains('Save changes').click()
      })

      // Delete the ticket
      cy.get('button[aria-label="Ticket actions"]').first().click()
      cy.contains('Delete').click()
      cy.get('button').contains('Delete').click()
      
      // Verify deletion
      cy.contains('Success').should('be.visible')
      cy.contains('Test Ticket').should('not.exist')
    })

    it("should validate required fields in create modal", () => {
      cy.contains("Create New Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Try to submit without filling required fields
      cy.get("form").within(() => {
        cy.contains("Create Ticket").click()
      })
      
      // Check for HTML5 validation messages
      cy.get("#subject").invoke('prop', 'validity')
        .should('deep.include', { valid: false })
      
      cy.get("#description").invoke('prop', 'validity')
        .should('deep.include', { valid: false })
    })

    it("should handle API errors gracefully in create modal", () => {
      cy.contains("Create New Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Intercept the API call and force it to fail
      cy.intercept("POST", "/api/tickets", {
        statusCode: 500,
        body: { error: "Internal server error" }
      })
      
      // Fill out and submit the form
      cy.get("#subject").should('be.visible').clear().type("Test Ticket")
      cy.get("#description").should('be.visible').clear().type("This is a test ticket description")
      cy.get("form").within(() => {
        cy.contains("Create Ticket").should('be.visible').click()
      })
      
      // Should show error toast
      cy.contains("Failed to create ticket").should("be.visible")
      
      // Modal should still be open
      cy.get("div[role='dialog']").should("be.visible")
    })

    it('should allow filtering tickets', () => {
      // Click the create ticket button
      cy.contains("Create New Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Fill out the form
      cy.get("#subject").should('be.visible').clear().type("Test Filter Ticket")
      cy.get("#description").should('be.visible').clear().type("This is a test ticket for filters")
      
      // Select priority - using a more specific selector
      cy.get("form").within(() => {
        cy.get("[role='combobox']").should('be.visible').click()
      })
      cy.get("[role='listbox']").should('be.visible').within(() => {
        cy.contains("Medium").click()
      })
      
      // Submit the form
      cy.get("form").within(() => {
        cy.contains("Create Ticket").should('be.visible').click()
      })
      
      // Should show success toast
      cy.contains("Ticket created successfully!").should("be.visible")
      
      // Modal should be closed
      cy.get("div[role='dialog']").should("not.exist")
      
      // New ticket should appear in the list
      cy.contains("Test Filter Ticket").should("be.visible")
      
      // Test search filter
      cy.get('input[placeholder="Search tickets..."]').type('Filter')
      cy.get('button').contains('Clear filters').should('be.visible')
      cy.contains("Test Filter Ticket").should("be.visible")
      cy.get('input[placeholder="Search tickets..."]').clear()

      // Test status filter
      cy.get('button[role="combobox"]').first().click()
      cy.get('[role="option"]').contains('Open').click()
      cy.contains("Test Filter Ticket").should("be.visible")
      cy.get('button').contains('Clear filters').click()
      cy.get('button[role="combobox"]').first().click()
      cy.get('[role="option"]').contains('All statuses').click()

      // Test creator filter
      cy.get('button[role="combobox"]').eq(1).click()
      cy.get('[role="option"]').contains('All creators').click()
      cy.contains("Test Filter Ticket").should("be.visible")
      cy.get('button[role="combobox"]').eq(1).click()
      cy.get('[role="option"]').not(':contains("All creators")').first().click()
      cy.get('button').contains('Clear filters').click()

      // Test assignee filter
      cy.get('button[role="combobox"]').eq(2).click()
      cy.get('[role="option"]').contains('All assignees').click()
      cy.contains("Test Filter Ticket").should("be.visible")
      cy.get('button[role="combobox"]').eq(2).click()
      cy.get('[role="option"]').contains('Unassigned').click()
      cy.get('button').contains('Clear filters').click()

      // Test multiple filters
      cy.get('input[placeholder="Search tickets..."]').type('Filter')
      cy.get('button[role="combobox"]').first().click()
      cy.get('[role="option"]').contains('Open').click()
      cy.contains("Test Filter Ticket").should("be.visible")
      cy.get('button').contains('Clear filters').click()

      // Clean up - delete the test ticket
      cy.get('button[aria-label="Ticket actions"]').first().click()
      cy.contains('Delete').click()
      cy.get('button').contains('Delete').click()
      
      // Verify deletion
      cy.contains('Success').should('be.visible')
      cy.contains('Test Filter Ticket').should('not.exist')
    })

    it('should show appropriate message when no tickets match filters', () => {
      // First ensure we have no tickets
      cy.intercept('GET', '**/rest/v1/tickets?*', {
        statusCode: 200,
        body: []
      }).as('getTickets')
      
      cy.visit('/customer/tickets')
      cy.wait('@getTickets')
      
      // Enter a search term that won't match any tickets
      cy.get('input[placeholder="Search tickets..."]').type('xyzabc123')
      cy.contains('Try adjusting your filters').should('be.visible')
      
      // Clear filters and verify empty state message changes
      cy.get('button').contains('Clear filters').click()
      cy.contains('Create a new ticket to get started').should('be.visible')
    })
  })

  describe("Employee Tickets", () => {
    beforeEach(() => {
      const email = Cypress.env('EMPLOYEE_TEST_USER_EMAIL')
      const password = Cypress.env('EMPLOYEE_TEST_USER_PASSWORD')
      
      // Login as employee
      cy.visit('/login')
      cy.get('input[type="email"]').should('be.visible').type(email)
      cy.get('input[type="password"]').should('be.visible').type(password)
      cy.get('button[type="submit"]').click()
      
      // Wait for redirect and page load
      cy.url().should('include', '/employee/dashboard')
      cy.get('h1').contains('Dashboard').should('be.visible')
    })

    it("should create, update, and delete ticket from tickets page", () => {
      // Navigate to tickets page
      cy.visit('/employee/tickets')
      cy.url().should('include', '/employee/tickets')
      cy.get('h1').contains('My Assigned Tickets').should('be.visible')

      // Create a ticket
      cy.contains('Create New Ticket').should('be.visible').click()
      cy.get('#subject').should('be.visible').type('Test Employee Ticket')
      cy.get('#description').should('be.visible').type('This is a test ticket')
      cy.get("form").within(() => {
        cy.get("[role='combobox']").should('be.visible').click()
      })
      cy.get("[role='listbox']").should('be.visible').within(() => {
        cy.contains("Medium").click()
      })
      cy.get("form").within(() => {
        cy.contains('Create Ticket').should('be.visible').click()
      })

      // Update the ticket
      cy.get('button[aria-label="Ticket actions"]').should('be.visible').first().click()
      cy.contains('Edit').click()
      cy.get('#subject').clear().type('Updated Employee Ticket')
      cy.get('form').within(() => {
        cy.contains('Save changes').click()
      })

      // Delete the ticket
      cy.get('button[aria-label="Ticket actions"]').should('be.visible').first().click()
      cy.contains('Delete').click()
      cy.get('button').contains('Delete').should('be.visible').click()
      
      // Verify deletion
      cy.contains('Success').should('be.visible')
      cy.contains('Test Employee Ticket').should('not.exist')
    })

    it("should update ticket status from the list view", () => {
      // Navigate to tickets page
      cy.visit('/employee/tickets')
      cy.url().should('include', '/employee/tickets')
      
      // Create a test ticket first
      cy.contains('Create New Ticket').click()
      cy.get('#subject').type('Status Test Ticket')
      cy.get('#description').type('Testing status updates')
      cy.get("form").within(() => {
        cy.get("[role='combobox']").click()
      })
      cy.get("[role='listbox']").within(() => {
        cy.contains("Medium").click()
      })
      cy.get("form").within(() => {
        cy.contains('Create Ticket').click()
      })

      // Verify the ticket is created with 'open' status
      cy.contains('Status Test Ticket').should('be.visible')
      cy.get('span').contains('open').should('be.visible')

      // Update status through dropdown
      cy.get('span').contains('open').click()
      cy.get('[role="listbox"]').within(() => {
        cy.contains('Pending').click()
      })
      cy.contains('Ticket status updated successfully').should('be.visible')
      cy.get('span').contains('pending').should('be.visible')

      // Update to resolved
      cy.get('span').contains('pending').click()
      cy.get('[role="listbox"]').within(() => {
        cy.contains('Resolved').click()
      })
      cy.contains('Ticket status updated successfully').should('be.visible')
      cy.get('span').contains('resolved').should('be.visible')

      // Clean up
      cy.get('button[aria-label="Ticket actions"]').first().click()
      cy.contains('Delete').click()
      cy.get('button').contains('Delete').click()
    })

    it("should handle status update errors gracefully", () => {
      // Navigate to tickets page
      cy.visit('/employee/tickets')
      cy.url().should('include', '/employee/tickets')
      
      // Create a test ticket first
      cy.contains('Create New Ticket').click()
      cy.get('#subject').type('Error Test Ticket')
      cy.get('#description').type('Testing error handling')
      cy.get("form").within(() => {
        cy.get("[role='combobox']").click()
      })
      cy.get("[role='listbox']").within(() => {
        cy.contains("Medium").click()
      })
      cy.get("form").within(() => {
        cy.contains('Create Ticket').click()
      })

      // Intercept the status update request and force it to fail
      cy.intercept('PATCH', '/api/tickets', {
        statusCode: 500,
        body: { error: "Failed to update status" }
      }).as('updateStatus')

      // Try to update status
      cy.get('span').contains('open').click()
      cy.get('[role="listbox"]').within(() => {
        cy.contains('Pending').click()
      })

      // Verify error message
      cy.contains('Failed to update ticket status').should('be.visible')
      cy.get('span').contains('open').should('be.visible') // Status should remain unchanged

      // Clean up
      cy.get('button[aria-label="Ticket actions"]').first().click()
      cy.contains('Delete').click()
      cy.get('button').contains('Delete').click()
    })
  })
}) 