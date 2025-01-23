import { TeamWithMembers } from '@/app/types/team'

describe('Teams Management', () => {
  let testTeam: TeamWithMembers

  beforeEach(() => {
    cy.loginAsAdmin()
    
    cy.visit('/employee/dashboard')
  })

  it('should display teams management page', () => {
    // Navigate to teams page and wait for it to load
    cy.visit('/admin/teams')
    cy.get('body').should('not.contain', 'Loading')
    
    // Verify page elements
    cy.contains('h1', 'Management').should('be.visible')
    cy.contains('h2', 'Teams').should('be.visible')
    cy.get('button').contains('Create Team').should('be.visible')
  })

  it('should create a new team', () => {
    cy.visit('/admin/teams')
    cy.get('body').should('not.contain', 'Loading')
    
    // Open create modal
    cy.get('button[data-testid="create-team-button"]', { timeout: 10000 }).click({ force: true })
    cy.get('input#name').should('be.visible')

    // Fill out the create team form
    cy.get('input#name').type('Test Team')
    cy.get('textarea#focus_area').type('Test Focus Area')
    cy.get('button[data-testid="submit-create-team"]').click({ force: true })

    // Wait for team to be created and verify it exists
    cy.contains('Test Team', { timeout: 10000 }).should('be.visible')
    cy.contains('Test Focus Area').should('be.visible')
  })

  it('should edit an existing team', () => {
    cy.visit('/admin/teams')
    cy.get('body').should('not.contain', 'Loading')
    
    // Click edit button on the first team
    cy.get('[aria-label="Edit team"]').first().should('be.visible').click()

    // Update team details
    cy.get('input#name').should('be.visible').clear().type('Updated Team Name')
    cy.get('textarea#focus_area').should('be.visible').clear().type('Updated Focus Area')
    cy.get('button').contains('Save Changes').click()

    // Verify changes
    cy.contains('Updated Team Name', { timeout: 10000 }).should('be.visible')
    cy.contains('Updated Focus Area').should('be.visible')
  })

  it('should add and remove team members', () => {
    cy.visit('/admin/teams')
    cy.get('body').should('not.contain', 'Loading')
    
    // Click on the first team to go to detail page
    cy.get('[data-testid="team-row"]').first().click({ force: true })
    cy.get('body').should('not.contain', 'Loading')

    // Add a team member
    cy.get('button[data-testid="add-member-button"]').click({ force: true })
    cy.get('input[data-testid="member-search"]').type(Cypress.env('EMPLOYEE_TEST_USER_EMAIL'))
    cy.get('[data-testid="member-option"]').contains(Cypress.env('EMPLOYEE_TEST_USER_EMAIL')).click({ force: true })

    // Verify member was added
    cy.get('[data-testid="team-member"]').contains(Cypress.env('EMPLOYEE_TEST_USER_EMAIL'), { timeout: 10000 }).should('be.visible')

    // Remove the member
    cy.get('[data-testid="remove-member"]').click({ force: true })

    // Verify member was removed
    cy.get('[data-testid="team-member"]').should('not.exist')
  })

  it('should delete a team', () => {
    cy.visit('/admin/teams')
    cy.get('body').should('not.contain', 'Loading')
    
    // Create a team to delete
    cy.get('button[data-testid="create-team-button"]').click({ force: true })
    cy.get('input#name').type('Team to Delete')
    cy.get('textarea#focus_area').type('Will be deleted')
    cy.get('button[data-testid="submit-create-team"]').click({ force: true })

    // Wait for team to be created and verify it exists
    cy.contains('Team to Delete', { timeout: 10000 }).should('be.visible')

    // Delete the team
    cy.get('[data-testid="team-row"]')
      .contains('Team to Delete')
      .parents('[data-testid="team-row"]')
      .within(() => {
        cy.get('[data-testid="delete-team"]').click({ force: true })
      })

    // Confirm deletion
    cy.get('button[data-testid="confirm-delete"]').click({ force: true })

    // Verify team was deleted
    cy.contains('Team to Delete').should('not.exist')
  })
}) 