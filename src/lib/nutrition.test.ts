import { describe, it, expect } from 'vitest';
import { calculateNutritionStats } from './nutrition';
import { UserData, RecipeHistory } from '../types';

describe('calculateNutritionStats', () => {
  it('returns null if required fields are missing', () => {
    const incompleteUser: UserData = {
      age: '',
      gender: '',
      weight: '',
      height: '',
      activityLevel: 'sedentary',
      goal: 'maintenance',
      mealPlanType: '1_recipe',
      preferences: ''
    };
    
    expect(calculateNutritionStats(incompleteUser)).toBeNull();
  });

  it('calculates stats correctly for a male wanting to maintain weight', () => {
    const user: UserData = {
      age: 25,
      gender: 'Pria',
      weight: 70, // kg
      height: 175, // cm
      activityLevel: 'moderate', // 1.55 multiplier
      goal: 'maintenance',
      mealPlanType: '1_recipe',
      preferences: ''
    };

    // BMR (Male): (10 * 70) + (6.25 * 175) - (5 * 25) + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
    // TDEE: 1673.75 * 1.55 = 2594.3125 -> Math.round -> 2594
    // BMI: 70 / (1.75 * 1.75) = 22.857...
    
    const stats = calculateNutritionStats(user);
    
    expect(stats).not.toBeNull();
    expect(stats?.bmi).toBe('22.9');
    expect(stats?.status).toBe('Normal (Sehat)');
    expect(stats?.tdee).toBe(2594);
    
    // Macros
    // Carbs: (2594 * 0.5) / 4 = 324.25 -> 324
    // Protein: (2594 * 0.3) / 4 = 194.55 -> 195
    // Fat: (2594 * 0.2) / 9 = 57.64... -> 58
    expect(stats?.macros.find(m => m.name === 'Karbohidrat')?.value).toBe(324);
    expect(stats?.macros.find(m => m.name === 'Protein')?.value).toBe(195);
    expect(stats?.macros.find(m => m.name === 'Lemak')?.value).toBe(58);
  });

  it('calculates stats correctly for a female wanting to lose weight', () => {
    const user: UserData = {
      age: 30,
      gender: 'Wanita',
      weight: 80, // kg
      height: 160, // cm
      activityLevel: 'light', // 1.375 multiplier
      goal: 'weight_loss', // -500 calories
      mealPlanType: '1_recipe',
      preferences: ''
    };

    // BMI: 80 / (1.6 * 1.6) = 31.25 -> Obesitas
    // BMR (Female): (10 * 80) + (6.25 * 160) - (5 * 30) - 161 = 800 + 1000 - 150 - 161 = 1489
    // TDEE limit: (1489 * 1.375) - 500 = 2047.375 - 500 = 1547
    
    const stats = calculateNutritionStats(user);
    
    expect(stats).not.toBeNull();
    expect(stats?.bmi).toBe('31.2');
    expect(stats?.status).toBe('Obesitas');
    expect(stats?.tdee).toBe(1547);
  });
});

describe('RecipeHistory Interface Usage', () => {
  it('correctly serializes and deserializes RecipeHistory arrays', () => {
    const mockHistory: RecipeHistory[] = [
      {
        id: '1',
        date: '10/10/2023',
        title: 'Healthy Salad',
        content: '# Healthy Salad Recipes',
        imageUrl: 'http://example.com/image.png',
        nutrition: {
          calories: 300,
          protein: 10,
          carbs: 20,
          fat: 15
        }
      }
    ];

    const serialized = JSON.stringify(mockHistory);
    // Mimicking localStorage retrieve behavior
    const parsed: RecipeHistory[] = JSON.parse(serialized);

    expect(parsed.length).toBe(1);
    expect(parsed[0].title).toBe('Healthy Salad');
    expect(parsed[0].nutrition?.calories).toBe(300);
  });
});
