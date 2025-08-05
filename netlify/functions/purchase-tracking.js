const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iavsuewaiberpzmhvlvy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const headers = {
  'Access-Control-Allow-Origin': 'https://forkedai.com',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Validate request body size
    if (event.body && event.body.length > 10000) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ error: 'Request too large' })
      };
    }

    const { action, email, ...data } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!action || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: action, email' })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate email length
    if (email.length > 255) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email too long' })
      };
    }

    // Validate action
    const validActions = ['getPurchaseStatus', 'setPurchaseStatus', 'updateGenerations', 'getGenerations'];
    if (!validActions.includes(action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

    switch (action) {
      case 'getPurchaseStatus':
        return await getPurchaseStatus(email);

      case 'setPurchaseStatus':
        return await setPurchaseStatus(email, data);

      case 'updateGenerations':
        return await updateGenerations(email, data);

      case 'getGenerations':
        return await getGenerations(email);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Purchase tracking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function getPurchaseStatus(email) {
  const { data, error } = await supabase
    .from('user_purchases')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      has_purchased: data?.has_purchased || false,
      generations_used: data?.generations_used || 0,
      generations_remaining: Math.max(0, 3 - (data?.generations_used || 0))
    })
  };
}

async function setPurchaseStatus(email, { has_purchased, stripe_payment_id }) {
  const { data, error } = await supabase
    .from('user_purchases')
    .upsert({
      email,
      has_purchased,
      purchase_date: has_purchased ? new Date().toISOString() : null,
      stripe_payment_id,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data)
  };
}

async function updateGenerations(email, { increment = 0, reset = false, add = 0 }) {
  if (reset) {
    const { data, error } = await supabase
      .from('user_purchases')
      .upsert({
        email,
        generations_used: 0,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ generations_used: 0, generations_remaining: 3 })
    };
  }

  // Get current usage
  const { data: current } = await supabase
    .from('user_purchases')
    .select('generations_used')
    .eq('email', email)
    .single();

  const currentUsed = current?.generations_used || 0;
  const newUsed = Math.max(0, currentUsed + increment - add);

  const { data, error } = await supabase
    .from('user_purchases')
    .upsert({
      email,
      generations_used: newUsed,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      generations_used: newUsed,
      generations_remaining: Math.max(0, 3 - newUsed)
    })
  };
}

async function getGenerations(email) {
  const { data, error } = await supabase
    .from('user_purchases')
    .select('generations_used')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  const used = data?.generations_used || 0;
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      generations_used: used,
      generations_remaining: Math.max(0, 3 - used)
    })
  };
}
