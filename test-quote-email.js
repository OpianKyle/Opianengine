import fetch from 'node-fetch';

const testQuoteRequestEmail = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/test-quote-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName: 'John Doe',
        customerEmail: 'test@example.com',
        productName: 'Premium Package',
        adminName: 'Admin User'
      }),
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testQuoteRequestEmail();
