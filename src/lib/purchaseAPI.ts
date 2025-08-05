// Purchase tracking API using Supabase backend
const API_BASE = '/.netlify/functions/purchase-tracking';

export interface PurchaseStatus {
  has_purchased: boolean;
  generations_used: number;
  generations_remaining: number;
}

// Get user's purchase status and generation count
export async function getPurchaseStatus(email: string): Promise<PurchaseStatus> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'getPurchaseStatus', email })
  });

  if (!response.ok) {
    throw new Error(`Failed to get purchase status: ${response.statusText}`);
  }

  return response.json();
}

// Set purchase status (when user completes payment)
export async function setPurchaseStatus(
  email: string, 
  hasPurchased: boolean, 
  stripePaymentId?: string
): Promise<void> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'setPurchaseStatus', 
      email, 
      has_purchased: hasPurchased,
      stripe_payment_id: stripePaymentId
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to set purchase status: ${response.statusText}`);
  }
}

// Increment generation usage (when user generates a recipe)
export async function incrementGenerationUsage(email: string): Promise<PurchaseStatus> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'updateGenerations', 
      email, 
      increment: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to increment generation usage: ${response.statusText}`);
  }

  return response.json();
}

// Reset generation usage (when user makes first purchase)
export async function resetGenerationUsage(email: string): Promise<PurchaseStatus> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'updateGenerations', 
      email, 
      reset: true
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to reset generation usage: ${response.statusText}`);
  }

  return response.json();
}

// Add generations (when user purchases more)
export async function addGenerations(email: string, amount: number): Promise<PurchaseStatus> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'updateGenerations', 
      email, 
      add: amount
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to add generations: ${response.statusText}`);
  }

  return response.json();
}
