import React from 'react';
import { Redirect } from 'expo-router';

/**
 * The Units screen was removed from onboarding in Stage 3.6 (defaulting to grams).
 * The Display Units toggle is kept in Settings only.
 */
export default function UnitsScreen() {
  return <Redirect href="/onboarding/week-start" />;
}
