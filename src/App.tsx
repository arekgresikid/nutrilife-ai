/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Leaf, User, Activity, Settings, RefreshCw, Send, Image as ImageIcon, Download, Clock, Sun, Moon } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select } from './components/ui/select-native';
import { UserData, RecipeHistory, RecipeNutrition } from './types';
import { calculateNutritionStats } from './lib/nutrition';

export default function App() {
  const [userData, setUserData] = useState<UserData>({
    age: '',
    gender: '',
    weight: '',
    height: '',
    activityLevel: 'sedentary',
    goal: 'maintenance',
    mealPlanType: '1_recipe',
    preferences: '',
    allergies: '',
    specialDiet: ''
  });


  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RecipeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [recipeNutrition, setRecipeNutrition] = useState<RecipeNutrition | null>(null);
  const [nutritionInfo, setNutritionInfo] = useState<{
    bmi: string;
    status: string;
    tdee: number;
    macros: { name: string; value: number; fill: string }[];
  } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);


  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('nutrilife_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const calculateNutrition = () => {
    const stats = calculateNutritionStats(userData);
    if (!stats) return;
    
    setNutritionInfo(stats);
    return stats.tdee;
  };

  const generateRecipe = async () => {
    try {
      setLoading(true);
      setRecipe('');
      setImageUrl('');

      const tdee = calculateNutrition();
      if (!tdee) {
        alert('Mohon lengkapi data profil terlebih dahulu.');
        setLoading(false);
        return;
      }

      const planText = userData.mealPlanType === '1_recipe' ? '1 resep masakan sehat' : 
                       userData.mealPlanType === '1_day' ? 'rencana makan sehat untuk 1 hari (Sarapan, Makan Siang, Makan Malam, Camilan)' : 
                       'rencana makan sehat untuk 1 minggu (7 hari, lengkap dengan daftar belanja)';

      const goalText = userData.goal === 'weight_loss' ? 'menurunkan lemak (cut)' : 
                       userData.goal === 'weight_gain' ? 'menambah massa otot (bulk)' : 
                       userData.goal === 'diabetes_friendly' ? 'mengontrol gula darah (ramah diabetes)' :
                       userData.goal === 'hypertension_friendly' ? 'diet rendah natrium (hipertensi)' :
                       'menjaga berat badan tetap ideal';

      const dietText = userData.specialDiet ? `Saya menjalani diet ${userData.specialDiet}.` : '';
      const allergyText = userData.allergies ? `Sangat penting: Saya memiliki ALERGI terhadap ${userData.allergies}. JANGAN gunakan bahan tersebut!` : 'Tidak ada alergi spesifik.';

      const prompt = `Saya ${userData.gender}, berusia ${userData.age} tahun, berat badan ${userData.weight} kg, tinggi ${userData.height} cm, dengan tingkat aktivitas ${userData.activityLevel}. 
      Target kalori harian saya: ${tdee} kkal.
      Tujuan utama: ${goalText}. 
      ${dietText}
      ${allergyText}
      Preferensi tambahan: ${userData.preferences || 'Tidak ada'}. 
      
      Tugas: Buatkan ${planText} dalam bahasa Indonesia yang sesuai dengan profil kesehatan saya. 
      Jika ini adalah 1 resep, sertakan: Nama Resep, Kalori & Makro, Bahan (pastikan aman dari alergi), dan Cara Membuat.
      Jika ini adalah rencana makan 1 hari atau 1 minggu, bagikan menu per harinya lengkap dengan estimasi kalori masing-masing dan rangkuman harian agar total kalorinya mendekati target ${tdee} kkal.
      Sertakan beberapa tips nutrisi terkait tujuan ${goalText}.
      Gunakan format markdown yang rapi (H2 untuk judul bagian) tanpa menyertakan blok kode.`;


      // Text Generation
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json() as any;

      
      const generatedText = data.recipe_markdown;
      const parsedNutrition = data.nutrition;

      setRecipe(generatedText);
      setRecipeNutrition(parsedNutrition);

      // Extract Recipe Name for Image Generation
      const recipeName = data.recipe_name || (userData.mealPlanType === '1_recipe' ? 'Healthy Food Plating' : 'Healthy Meal Plan');
      
      const imagePrompt = encodeURIComponent(`A delicious, high quality, professional food photography of ${recipeName}, healthy meal, beautiful plating, natural lighting, 4k`);
      const genImageUrl = `https://gen.pollinations.ai/image/${imagePrompt}?width=800&height=600&nologo=true`;
      setImageUrl(genImageUrl);

      // Save to history
      const newHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('id-ID'),
        title: recipeName,
        content: generatedText, // save clean text
        imageUrl: genImageUrl,
        nutrition: parsedNutrition
      };
      
      setHistory(prev => {
        const updated = [newHistoryItem, ...prev].slice(0, 10); // Keep last 10
        localStorage.setItem('nutrilife_history', JSON.stringify(updated));
        return updated;
      });

    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Gagal menghasilkan resep. Pastikan koneksi internet Anda stabil.');
    } finally {
      setLoading(false);
    }
  };

  const shareToWhatsApp = () => {
    if (!recipe) return;
    const cleanRecipe = recipe.replace(/\\*\\*(.*?)\\*\\*/g, '*$1*').replace(/#/g, '*');
    const text = encodeURIComponent(`*Resep Sehat Nutrisi Life* 🌱\n\n` + cleanRecipe + `\n\n_Diberdayakan oleh Ai Studio & Pollinations AI_`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const downloadPDF = async () => {
    const recipeElement = document.getElementById('recipe-content');
    if (!recipeElement) return;
    
    try {
      setLoading(true);
      const canvas = await html2canvas(recipeElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Resep_Nutrisi_Life.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal mengunduh PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 pb-12 transition-colors duration-500">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-100 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-800/50">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-none">
              <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 tracking-tight">NutriLife AI</h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">Asisten Gizi Cerdas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-full w-10 h-10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 active:scale-90"
              title={isDarkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-500" />
              )}
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowHistory(!showHistory)} 
              className={`rounded-full w-10 h-10 transition-all ${showHistory ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'text-slate-500'}`}
              title="Riwayat Resep"
            >
              <Clock className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Form & Profile */}
        <div className="md:col-span-5 space-y-6">
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-emerald-200 dark:border-emerald-900/50 glass-card">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base text-emerald-800 dark:text-emerald-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Riwayat Resep</CardTitle>
                    <CardDescription className="dark:text-slate-400 text-slate-500">Akses kembali rencana makan yang pernah dibuat.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pb-4 px-4">
                    {history.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Belum ada riwayat.</p>
                      </div>
                    ) : (
                      history.map(item => (
                        <div 
                          key={item.id} 
                          className="p-3 bg-white/50 dark:bg-slate-800/40 rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all border border-slate-100 dark:border-slate-800 flex items-center gap-4 group"
                          onClick={() => {
                            setRecipe(item.content);
                            setImageUrl(item.imageUrl);
                            setRecipeNutrition(item.nutrition || null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <img src={item.imageUrl} alt={item.title} className="w-14 h-14 object-cover rounded-lg shadow-sm" />

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.date}</p>
                          </div>

                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="glass-card overflow-hidden">

            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Profil Kesehatan</CardTitle>
              <CardDescription className="dark:text-slate-400 text-slate-500">Data ini membantu AI merancang nutrisi yang paling tepat untuk kondisi tubuh Anda.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className="dark:text-slate-200">Usia (Tahun)</Label>
                  <Input id="age" type="number" value={userData.age} onChange={(e) => setUserData({...userData, age: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Contoh: 25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="dark:text-slate-200">Jenis Kelamin</Label>
                  <Select value={userData.gender} onChange={(e) => setUserData({...userData, gender: e.target.value as any})} id="gender">
                    <option value="">Pilih</option>
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="dark:text-slate-200">Berat Badan (kg)</Label>
                  <Input id="weight" type="number" value={userData.weight} onChange={(e) => setUserData({...userData, weight: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Contoh: 65" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="dark:text-slate-200">Tinggi Badan (cm)</Label>
                  <Input id="height" type="number" value={userData.height} onChange={(e) => setUserData({...userData, height: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Contoh: 170" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityLevel" className="dark:text-slate-200">Tingkat Aktivitas Fisik</Label>
                <Select value={userData.activityLevel} onChange={(e) => setUserData({...userData, activityLevel: e.target.value})} id="activityLevel">
                  <option value="sedentary">Sedentary (Banyak Duduk)</option>
                  <option value="light">Lightly Active (Olahraga 1-3x/minggu)</option>
                  <option value="moderate">Moderately Active (Olahraga 3-5x/minggu)</option>
                  <option value="active">Very Active (Olahraga 6-7x/minggu)</option>
                  <option value="extra_active">Extra Active (Fisik Berat/Atlet)</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal" className="dark:text-slate-200">Tujuan Kesehatan</Label>
                  <Select value={userData.goal} onChange={(e) => setUserData({...userData, goal: e.target.value})} id="goal">
                    <option value="weight_loss">Menurunkan Lemak (Cut)</option>
                    <option value="maintenance">Maintenance (Tetap)</option>
                    <option value="weight_gain">Menambah Massa Otot (Bulk)</option>
                    <option value="diabetes_friendly">Ramah Diabetes</option>
                    <option value="hypertension_friendly">Rendah Natrium (Hipertensi)</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialDiet" className="dark:text-slate-200">Jenis Diet</Label>
                  <Select value={userData.specialDiet} onChange={(e) => setUserData({...userData, specialDiet: e.target.value})} id="specialDiet">
                    <option value="">Normal (Tanpa Diet)</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="keto">Ketogenik</option>
                    <option value="low_carb">Rendah Karbohidrat</option>
                    <option value="halal">Halal</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies" className="dark:text-slate-200">Alergi & Pantangan</Label>
                <Input id="allergies" value={userData.allergies} onChange={(e) => setUserData({...userData, allergies: e.target.value})} placeholder="Contoh: Kacang, Seafood, Gluten, Susu..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mealPlanType" className="dark:text-slate-200">Jenis Rencana Makan</Label>
                <Select value={userData.mealPlanType} onChange={(e) => setUserData({...userData, mealPlanType: e.target.value})} id="mealPlanType">
                  <option value="1_recipe">1 Resep Sehat Spesifik</option>
                  <option value="1_day">Menu Lengkap 1 Hari (B, L, D)</option>
                  <option value="1_week">Saran Menu 1 Minggu</option>
                </Select>
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={generateRecipe} disabled={loading} className="w-full h-12 text-md">
                {loading ? <span className="flex items-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" /> Menganalisis...</span> : 'Analisis & Buat Resep'}
              </Button>
            </CardFooter>
          </Card>

          {nutritionInfo && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="premium-gradient text-white border-0 shadow-xl">

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5" /> Ringkasan Kebutuhan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 divide-x divide-emerald-400">
                    <div className="px-2">
                      <p className="text-emerald-100 text-sm">BMI Anda</p>
                      <p className="text-2xl font-bold">{nutritionInfo.bmi}</p>
                      <p className="text-sm bg-white/20 inline-block px-2 py-0.5 rounded-full mt-1">{nutritionInfo.status}</p>
                    </div>
                    <div className="px-4">
                      <p className="text-emerald-100 text-sm">Kebutuhan Kalori</p>
                      <p className="text-2xl font-bold">{nutritionInfo.tdee} <span className="text-sm font-normal">kkal/hari</span></p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-400/30">
                    <p className="text-emerald-100 text-sm mb-3 font-semibold">Rekomendasi Makronutrien Harian</p>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={nutritionInfo.macros}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {nutritionInfo.macros.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => [`${value} gr`, 'Jumlah']}
                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#000', border: 'none', borderRadius: '8px' }}
                          />
                          <RechartsLegend wrapperStyle={{ fontSize: '12px', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-6 pt-4 border-t border-emerald-400/30 text-sm text-emerald-50 max-h-64 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      <p><strong className="text-white">Kalori:</strong> Satuan energi tubuh. Defisit untuk mengurangi berat badan, surplus untuk menambah.</p>
                      <p><strong className="text-white">Protein:</strong> Penting untuk pembentukan dan perbaikan otot, enzim, serta sel-sel tubuh.</p>
                      <p><strong className="text-white">Karbohidrat:</strong> Bahan bakar utama otak dan otot. Pilih karbohidrat kompleks agar kenyang lebih lama.</p>
                      <p><strong className="text-white">Lemak:</strong> Esensial untuk hormon dan penyerapan vitamin. Fokus pada lemak baik (alpukat, kacang).</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Nutrition Comparison Chart (only shown when recipe exists and parsed correctly) */}
          {recipeNutrition && nutritionInfo && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> 
                    Perbandingan & Detail Nutrisi
                  </CardTitle>
                  <CardDescription>Target harian vs Rekomendasi Menu (serta Mikronutrien)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Calories comparison */}
                  <div>
                    <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Kalori (kkal)</p>

                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Target Harian', value: nutritionInfo.tdee, fill: '#10b981' },
                            { name: 'Menu AI', value: recipeNutrition.calories, fill: '#3b82f6' }
                          ]}
                          layout="vertical"
                          margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                          <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {
                              [{fill: '#10b981'}, {fill: '#3b82f6'}].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Macros comparison */}
                  <div>
                    <p className="text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Makronutrien (gram)</p>

                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { 
                              name: 'Protein', 
                              Target: nutritionInfo.macros.find(m => m.name === 'Protein')?.value || 0,
                              Menu: recipeNutrition.protein
                            },
                            { 
                              name: 'Karbo', 
                              Target: nutritionInfo.macros.find(m => m.name === 'Karbohidrat')?.value || 0,
                              Menu: recipeNutrition.carbs
                            },
                            { 
                              name: 'Lemak', 
                              Target: nutritionInfo.macros.find(m => m.name === 'Lemak')?.value || 0,
                              Menu: recipeNutrition.fat
                            }
                          ]}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px' }} />
                          <RechartsLegend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Bar dataKey="Target" fill="#10b981" radius={[4, 4, 0, 0]} name="Target Harian" />
                          <Bar dataKey="Menu" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Menu AI" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Micronutrients Details */}
                  {recipeNutrition.micronutrients && (
                     <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                       <p className="text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Estimasi Mikronutrien</p>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30">
                           <p className="text-xs text-orange-600 dark:text-orange-400 mb-1 font-medium">Vitamin C</p>
                           <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{recipeNutrition.micronutrients.vitamin_c_mg} <span className="text-xs font-normal">mg</span></p>
                           <p className="text-[10px] text-orange-500 dark:text-orange-400 mt-1">Imunitas & kulit</p>
                         </div>

                         <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                           <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 font-medium">Vitamin A</p>
                           <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{recipeNutrition.micronutrients.vitamin_a_mcg} <span className="text-xs font-normal">mcg</span></p>
                           <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-1">Mata & kekebalan</p>
                         </div>
                         <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                           <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">Kalsium</p>
                           <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{recipeNutrition.micronutrients.calcium_mg} <span className="text-xs font-normal">mg</span></p>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Tulang & gigi</p>
                         </div>
                         <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                           <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-medium">Zat Besi</p>
                           <p className="text-lg font-bold text-red-700 dark:text-red-300">{recipeNutrition.micronutrients.iron_mg} <span className="text-xs font-normal">mg</span></p>
                           <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Sel darah merah</p>
                         </div>
                       </div>
                     </div>
                  )}

                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right Column: Recipe Result - Bento Grid Layout */}
        <div className="md:col-span-7 space-y-6">
          {recipe ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Image Card */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="overflow-hidden h-full glass-card border-0">
                    <div className="relative group h-full min-h-[240px]">
                      <div className="absolute inset-0 bg-black/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Visualisasi Menu AI</p>
                      </div>
                      <img 
                        src={imageUrl} 
                        alt="Recipe" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </Card>
                </motion.div>

                {/* Quick Info Card */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="h-full glass-card flex flex-col justify-center p-6 border-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Kalori</p>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{recipeNutrition?.calories || '-'} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">kkal</span></p>

                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Protein</p>
                          <p className="font-bold dark:text-slate-200">{recipeNutrition?.protein}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Karbo</p>
                          <p className="font-bold dark:text-slate-200">{recipeNutrition?.carbs}g</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lemak</p>
                          <p className="font-bold dark:text-slate-200">{recipeNutrition?.fat}g</p>
                        </div>

                      </div>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Recipe Content Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="overflow-hidden glass-card border-0">
                  <div id="recipe-content" className="bg-white/50 dark:bg-slate-900/50 p-6 sm:p-8">
                    <div className="prose prose-emerald dark:prose-invert max-w-none">
                      <ReactMarkdown>{recipe}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="bg-slate-50/80 dark:bg-slate-900/80 p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-3">
                    <Button onClick={downloadPDF} variant="outline" className="gap-2 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                      <Download className="w-4 h-4" />
                      Unduh PDF
                    </Button>
                    <Button onClick={shareToWhatsApp} className="gap-2 bg-[#25D366] hover:bg-[#20bd5a] border-none text-white shadow-lg shadow-emerald-500/20">
                      <Send className="w-4 h-4" />
                      Kirim ke WhatsApp
                    </Button>
                  </div>
                </Card>
              </motion.div>
            </div>
          ) : (

            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">

              {loading ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-emerald-100 dark:border-emerald-950/30 border-t-emerald-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Leaf className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-lg">AI Sedang Meracik Menu...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Menganalisis profil nutrisi dan menghasilkan visual hidangan lezat khusus untuk Anda.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 max-w-sm py-12">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2 rotate-3 shadow-inner">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-slate-800 dark:text-slate-200 font-bold text-xl">Siap Memulai Hidup Sehat?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Lengkapi profil kesehatan Anda di samping, lalu AI akan merancang menu yang paling optimal untuk target Anda.</p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

