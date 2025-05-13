/**
 * Test the card status endpoint
 */
async function testCardStatus() {
  try {
    console.log('Testing card status test endpoint...');
    const response = await fetch('/api/admin/customers/card-status-test', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    return data;
  } catch (error) {
    console.error('Error testing card status:', error);
    throw error;
  }
}

// For direct execution in browser console
if (typeof window !== 'undefined') {
  window.testCardStatus = testCardStatus;
  console.log('Run testCardStatus() to test the card status endpoint');
}