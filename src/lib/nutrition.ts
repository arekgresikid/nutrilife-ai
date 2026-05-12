import { UserData } from '../types';

export function calculateNutritionStats(userData: UserData) {
  if (!userData.weight || !userData.height || !userData.age || !userData.gender) return null;
  
  const weightInfo = Number(userData.weight);
  const heightInfo = Number(userData.height) / 100; // cm to m
  const ageInfo = Number(userData.age);
  
  // BMI
  const bmi = weightInfo / (heightInfo * heightInfo);
  let status = '';
  if (bmi < 18.5) status = 'Kekurangan Berat Badan';
  else if (bmi >= 18.5 && bmi < 24.9) status = 'Normal (Sehat)';
  else if (bmi >= 25 && bmi < 29.9) status = 'Kelebihan Berat Badan';
  else status = 'Obesitas';

  // BMR (Mifflin-St Jeor Equation)
  let bmr = 0;
  if (userData.gender === 'Pria') {
    bmr = (10 * weightInfo) + (6.25 * Number(userData.height)) - (5 * ageInfo) + 5;
  } else {
    bmr = (10 * weightInfo) + (6.25 * Number(userData.height)) - (5 * ageInfo) - 161;
  }

  // TDEE
  let tdeeMultiplier = 1.2;
  switch (userData.activityLevel) {
    case 'sedentary': tdeeMultiplier = 1.2; break;
    case 'light': tdeeMultiplier = 1.375; break;
    case 'moderate': tdeeMultiplier = 1.55; break;
    case 'active': tdeeMultiplier = 1.725; break;
    case 'very_active': tdeeMultiplier = 1.9; break;
  }

  let tdeeValue = Math.round(bmr * tdeeMultiplier);
  if (userData.goal === 'weight_loss') tdeeValue -= 500;
  if (userData.goal === 'weight_gain') tdeeValue += 500;
  
  // Macro split: 50% carbs, 30% protein, 20% fat
  const carbsGrams = Math.round((tdeeValue * 0.5) / 4);
  const proteinGrams = Math.round((tdeeValue * 0.3) / 4);
  const fatGrams = Math.round((tdeeValue * 0.2) / 9);

  return {
    bmi: bmi.toFixed(1),
    status,
    tdee: tdeeValue,
    macros: [
      { name: 'Karbohidrat', value: carbsGrams, fill: '#10b981' },
      { name: 'Protein', value: proteinGrams, fill: '#3b82f6' },
      { name: 'Lemak', value: fatGrams, fill: '#f59e0b' }
    ]
  };
}
