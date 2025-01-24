import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set in environment variables')
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

interface SendTemplateEmailParams {
  to: string
  templateId: string
  dynamicTemplateData: Record<string, any>
}

export async function sendTemplateEmail({
  to,
  templateId,
  dynamicTemplateData,
}: SendTemplateEmailParams): Promise<boolean> {
  try {
    // Debug log
    console.log('Sending email with params:', {
      to,
      templateId,
      dynamicTemplateData,
    })

    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com', // Make sure to set this in .env
      templateId,
      dynamicTemplateData,
    })
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
} 