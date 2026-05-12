export interface UserData {
  age: number | '';
  gender: 'Pria' | 'Wanita' | '';
  weight: number | '';
  height: number | '';
  activityLevel: string;
  goal: string;
  mealPlanType: string;
  preferences: string;
  allergies: string;
  specialDiet: string;
}


export interface Micronutrients {
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
  calcium_mg: number;
  iron_mg: number;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: Micronutrients;
}

export interface RecipeHistory {
  id: string;
  date: string;
  title: string;
  content: string;
  imageUrl: string;
  nutrition?: RecipeNutrition | null;
}
