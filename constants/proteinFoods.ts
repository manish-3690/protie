/**
 * Protein food data for Onboarding (Stage 2)
 * Illustrative estimates for quick initial logging.
 */

export interface ProteinFood {
  id: string;
  name: string;
  defaultProteinGrams: number;
  defaultServingLabel: string;
  servingUnitName: string;
  minServings: number;
  maxServings: number;
  stepServings: number;
  approxGramsPerServing: number;
  badgeColor: string;
  iconSymbol: string;
}

export const PROTEIN_FOODS: ProteinFood[] = [
  {
    id: 'eggs',
    name: 'Eggs',
    defaultProteinGrams: 12,
    defaultServingLabel: '2 large eggs (~100g)',
    servingUnitName: 'serving (2 eggs)',
    minServings: 0.5,
    maxServings: 6,
    stepServings: 0.5,
    approxGramsPerServing: 100,
    badgeColor: '#F2BB4B', // Gold/amber
    iconSymbol: '🥚',
  },
  {
    id: 'chicken',
    name: 'Chicken',
    defaultProteinGrams: 30,
    defaultServingLabel: '100g cooked breast',
    servingUnitName: 'serving (100g)',
    minServings: 0.5,
    maxServings: 5,
    stepServings: 0.5,
    approxGramsPerServing: 100,
    badgeColor: '#D97935', // Protie orange-brown
    iconSymbol: '🍗',
  },
  {
    id: 'paneer',
    name: 'Paneer',
    defaultProteinGrams: 20,
    defaultServingLabel: '100g fresh paneer',
    servingUnitName: 'serving (100g)',
    minServings: 0.5,
    maxServings: 5,
    stepServings: 0.5,
    approxGramsPerServing: 100,
    badgeColor: '#E6A838', // Warm cheese gold
    iconSymbol: '🧀',
  },
  {
    id: 'dal',
    name: 'Dal',
    defaultProteinGrams: 9,
    defaultServingLabel: '1 bowl cooked dal (~150g)',
    servingUnitName: 'bowl (~150g)',
    minServings: 0.5,
    maxServings: 4,
    stepServings: 0.5,
    approxGramsPerServing: 150,
    badgeColor: '#C47230', // Rich lentil amber
    iconSymbol: '🍲',
  },
  {
    id: 'whey',
    name: 'Whey',
    defaultProteinGrams: 24,
    defaultServingLabel: '1 standard scoop (30g)',
    servingUnitName: 'scoop (30g)',
    minServings: 0.5,
    maxServings: 4,
    stepServings: 0.5,
    approxGramsPerServing: 30,
    badgeColor: '#3B6CB5', // Classic whey blue
    iconSymbol: '🥤',
  },
  {
    id: 'tofu',
    name: 'Tofu',
    defaultProteinGrams: 15,
    defaultServingLabel: '100g firm tofu',
    servingUnitName: 'serving (100g)',
    minServings: 0.5,
    maxServings: 5,
    stepServings: 0.5,
    approxGramsPerServing: 100,
    badgeColor: '#8C9B58', // Fresh herb green
    iconSymbol: '🌱',
  },
  {
    id: 'greek_yogurt',
    name: 'Greek Yogurt',
    defaultProteinGrams: 15,
    defaultServingLabel: '150g plain cup',
    servingUnitName: 'cup (~150g)',
    minServings: 0.5,
    maxServings: 4,
    stepServings: 0.5,
    approxGramsPerServing: 150,
    badgeColor: '#E27D60', // Soft yogurt terracotta
    iconSymbol: '🥣',
  },
  {
    id: 'fish',
    name: 'Fish',
    defaultProteinGrams: 25,
    defaultServingLabel: '100g white or salmon fillet',
    servingUnitName: 'fillet (~100g)',
    minServings: 0.5,
    maxServings: 5,
    stepServings: 0.5,
    approxGramsPerServing: 100,
    badgeColor: '#4A98A8', // Ocean teal
    iconSymbol: '🐟',
  },
];

export const OTHER_FOOD: ProteinFood = {
  id: 'other',
  name: 'Other',
  defaultProteinGrams: 20,
  defaultServingLabel: 'Custom entry',
  servingUnitName: 'serving',
  minServings: 0.5,
  maxServings: 10,
  stepServings: 0.5,
  approxGramsPerServing: 100,
  badgeColor: '#D97935', // Brand primary orange-brown
  iconSymbol: '⚡',
};

export function getProteinFoodById(id: string): ProteinFood | undefined {
  if (id === 'other' || id === 'custom') {
    return OTHER_FOOD;
  }
  return PROTEIN_FOODS.find(
    (f) => f.id === id || (id === 'yogurt' && f.id === 'greek_yogurt')
  );
}
