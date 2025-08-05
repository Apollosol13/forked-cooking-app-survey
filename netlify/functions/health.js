exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://forkedai.com',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
      body: '',
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://forkedai.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      status: 'OK', 
      message: 'Netlify Functions are running',
      timestamp: new Date().toISOString()
    }),
  };
}; 