/**
 * Pricing Constants for Protie Paywall (Stage 6)
 *
 * Configurable placeholder amounts in Indian Rupees (₹).
 * Easy to edit and replace when live App Store / Google Play products are configured.
 */

export interface PricingPlan {
  id: 'monthly' | 'lifetime' | 'downsell_annual';
  name: string;
  priceFormatted: string;
  originalPriceFormatted?: string;
  priceAmount: number;
  currency: string;
  billingPeriod: string;
  trialDays?: number;
  badge?: string;
  discountBadge?: string;
  tagline: string;
  description: string;
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceFormatted: '₹299',
    priceAmount: 299,
    currency: 'INR',
    billingPeriod: 'per month',
    trialDays: 3,
    tagline: '3-day free trial, then ₹299/mo',
    description: 'Billed monthly. Cancel anytime before trial ends with no charge.',
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    priceFormatted: '₹1,999',
    priceAmount: 1999,
    currency: 'INR',
    billingPeriod: 'one-time payment',
    badge: 'BEST VALUE',
    discountBadge: 'PAY ONCE',
    tagline: 'Pay once, keep forever',
    description: 'Lifetime access to all current and future Protie Pro features.',
  },
  downsellAnnual: {
    id: 'downsell_annual',
    name: 'First Year Special',
    priceFormatted: '₹999',
    originalPriceFormatted: '₹1,999',
    priceAmount: 999,
    currency: 'INR',
    billingPeriod: 'per year',
    badge: '50% OFF',
    discountBadge: '50% SAVINGS',
    tagline: '50% off your first year',
    description: 'Save 50% on your first year of Protie Pro. Renews annually.',
  },
};

export const PAID_FEATURES = [
  'Unlimited custom food logging',
  'Deep protein insights & trends',
  'AI smart food scanning',
  'Exclusive Tank skins & themes',
] as const;
