import { NextResponse } from 'next/server';

interface SendGridContact {
  email: string;
  first_name?: string;
  last_name?: string;
}

interface SendGridRequest {
  list_ids: string[];
  contacts: SendGridContact[];
}

/**
 * Check if SendGrid should be bypassed
 */
function isSendGridBypassed(): boolean {
  return process.env.SENDGRID_ENABLED === 'FALSE';
}

async function addContactToSendGrid(email: string, firstName?: string, lastName?: string) {
  // Bypass SendGrid API call if disabled
  if (isSendGridBypassed()) {
    console.log(`🚫 SendGrid Bypassed: Would add contact ${email} to SendGrid list`);
    return { job_id: `MOCK${Date.now()}` };
  }

  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  const sendGridListId = process.env.SENDGRID_LIST_ID;

  if (!sendGridApiKey) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  if (!sendGridListId) {
    throw new Error('SENDGRID_LIST_ID not configured');
  }

  const contact: SendGridContact = {
    email: email.toLowerCase().trim(),
  };

  if (firstName?.trim()) {
    contact.first_name = firstName.trim();
  }

  if (lastName?.trim()) {
    contact.last_name = lastName.trim();
  }

  const requestBody: SendGridRequest = {
    list_ids: [sendGridListId],
    contacts: [contact]
  };

  console.log(`📧 Adding contact to SendGrid list: ${email}`);

  const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('SendGrid API error:', response.status, errorData);
    throw new Error(`Failed to add contact to SendGrid: ${response.status}`);
  }

  const responseData = await response.json();
  console.log(`📧 Successfully queued contact for SendGrid list. Job ID: ${responseData.job_id}`);
  
  return responseData;
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, consentGiven } = await request.json();
    
    // Basic validation
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required' }, 
        { status: 400 }
      );
    }
    
    if (!consentGiven) {
      return NextResponse.json(
        { success: false, message: 'Consent is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }
    
    console.log(`Processing email subscription for: ${email}`);
    
    try {
      // Add contact to SendGrid mailing list
      await addContactToSendGrid(email, firstName, lastName);
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'You have been successfully subscribed to AF Daily' 
        },
        { status: 200 }
      );
      
    } catch (sendGridError) {
      console.error('SendGrid error:', sendGridError);
      
      // Check if it's a configuration error vs API error
      if (sendGridError instanceof Error && 
          (sendGridError.message.includes('not configured') || 
           sendGridError.message.includes('SENDGRID'))) {
        return NextResponse.json(
          { success: false, message: 'Email service is not properly configured' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Failed to subscribe. Please try again later.' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in email subscription API:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
} 