describe("Ticket Creation", () => {
  describe("Customer View", () => {
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

    it("should open the create ticket modal and create a ticket", () => {
      // Click the create ticket button
      cy.contains("Create New Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Fill out the form
      cy.get("#subject").should('be.visible').clear().type("Test Ticket")
      cy.get("#description").should('be.visible').clear().type("This is a test ticket description")
      
      // Select priority - using data-state to ensure the select is closed before clicking
      cy.get("[role='combobox']").should('be.visible').click()
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
    })

    it("should validate required fields", () => {
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

    it("should handle API errors gracefully", () => {
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
  })

  describe("Employee View", () => {
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

    it("should create ticket from dashboard", () => {
      // Click the create ticket button
      cy.contains("Create Ticket").should('be.visible').click()
      
      // Wait for modal to be fully visible
      cy.get("div[role='dialog']").should("be.visible")
      cy.get("h2").contains("Create New Ticket").should("be.visible")
      
      // Fill out the form
      cy.get("#subject").should('be.visible').clear().type("Test Ticket")
      cy.get("#description").should('be.visible').clear().type("This is a test ticket description")
      
      // Select priority - using data-state to ensure the select is closed before clicking
      cy.get("[role='combobox']").should('be.visible').click()
      cy.get("[role='listbox']").should('be.visible').within(() => {
        cy.contains("Medium").click()
      })
      
      // Submit the form
      cy.get("form").within(() => {
        cy.contains("Create Ticket").should('be.visible').click()
      })
      
      // New ticket should appear in the list
      cy.contains("Test Ticket").should("be.visible")
    })
  })
}) 