describe("Employee Tickets Page", () => {
  beforeEach(() => {
    const email = Cypress.env('EMPLOYEE_TEST_USER_EMAIL')
    const password = Cypress.env('EMPLOYEE_TEST_USER_PASSWORD')
    
    // Login as employee
    cy.visit('/login')
    cy.get('input[type="email"]').should('be.visible').type(email)
    cy.get('input[type="password"]').should('be.visible').type(password)
    cy.get('button[type="submit"]').click()
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/employee/dashboard')
    
    // Navigate to tickets page
    cy.visit('/employee/tickets')
    cy.url().should('include', '/employee/tickets')
  })

  it("should display the tickets page", () => {
    cy.get('h1').contains('My Assigned Tickets').should('be.visible')
  })

  it("should show loading state initially", () => {
    cy.visit('/employee/tickets') // Force a fresh load
    cy.contains('Loading tickets...').should('be.visible')
  })

  it("should display empty state when no tickets", () => {
    // Intercept the tickets query and return empty array
    cy.intercept('GET', '**/rest/v1/tickets?*', {
      statusCode: 200,
      body: []
    }).as('getTickets')
    
    cy.visit('/employee/tickets')
    cy.wait('@getTickets')
    
    cy.contains('No tickets assigned').should('be.visible')
    cy.contains('You currently have no tickets assigned to you').should('be.visible')
  })

  it("should create and display a new ticket", () => {
    // Click create ticket button
    cy.contains('Create New Ticket').click()
    
    // Wait for modal
    cy.get("div[role='dialog']").should("be.visible")
    cy.get("h2").contains("Create New Ticket").should("be.visible")
    
    // Fill form
    cy.get("#subject").type("Test Employee Ticket")
    cy.get("#description").type("This is a test ticket created by an employee")
    
    // Select priority
    cy.get("[role='combobox']").click()
    cy.get("[role='listbox']").within(() => {
      cy.contains("High").click()
    })
    
    // Submit
    cy.get("form").within(() => {
      cy.contains("Create Ticket").click()
    })
    
    // Verify ticket appears in list
    cy.contains("Test Employee Ticket").should("be.visible")
    cy.contains("This is a test ticket created by an employee").should("be.visible")
  })

  it("should display ticket status correctly", () => {
    // Intercept the tickets query and return a test ticket
    cy.intercept('GET', '**/rest/v1/tickets?*', {
      statusCode: 200,
      body: [{
        id: '123',
        subject: 'Status Test Ticket',
        description: 'Testing status display',
        status: 'open',
        created_at: new Date().toISOString()
      }]
    }).as('getTickets')
    
    cy.visit('/employee/tickets')
    cy.wait('@getTickets')
    
    // Verify status badge exists and has correct styling
    cy.contains("open")
      .should("be.visible")
      .should("have.css", "background-color", "rgb(254, 242, 242)")
      .should("have.css", "color", "rgb(153, 27, 27)")
  })
}) 