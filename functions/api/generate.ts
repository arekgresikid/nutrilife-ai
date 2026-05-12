/// <reference types="@cloudflare/workers-types" />
export const onRequestPost: PagesFunction<{ POLLINATIONS_API_KEY: string }> = async (context) => {

  try {
    const { prompt } = (await context.request.json()) as { prompt: string };
    const apiKey = (context.env.POLLINATIONS_API_KEY || "").replace(/['"]+/g, '').trim();

    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { 
            role: 'system', 
            content: 'Anda adalah ahli gizi profesional. Berikan respon dalam format Markdown. Selalu sertakan ringkasan nutrisi di akhir dalam format JSON di dalam blok teks ---NUTRITION_JSON--- {...} ---END---.' 
          },
          { 
            role: 'user', 
            content: prompt + '\n\nJangan lupa sertakan blok NUTRITION_JSON di akhir dengan struktur: {"calories": number, "protein": number, "carbs": number, "fat": number, "micronutrients": {"vitamin_a_mcg": number, "vitamin_c_mg": number, "calcium_mg": number, "iron_mg": number}}' 
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ error: `Pollinations API Error: ${response.status}`, details: errorBody }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: any = await response.json();
    const fullText = data.choices?.[0]?.message?.content || "";


    // Extract JSON nutrition data
    const jsonMatch = fullText.match(/---NUTRITION_JSON---([\s\S]*?)---END---/);
    let nutrition = null;
    let cleanMarkdown = fullText;

    if (jsonMatch) {
      try {
        nutrition = JSON.parse(jsonMatch[1].trim());
        cleanMarkdown = fullText.replace(/---NUTRITION_JSON---[\s\S]*?---END---/, '').trim();
      } catch (e) {
        console.error("Failed to parse nutrition JSON from Pollinations", e);
      }
    }

    // Extract title/recipe name
    const nameMatch = cleanMarkdown.match(/(?:Nama Resep|Resep|Menu)[:\-\*]?\s*([^\n]+)/i);
    const recipeName = nameMatch ? nameMatch[1].trim().replace(/\*/g, '') : "Rencana Nutrisi Life";

    return new Response(JSON.stringify({
      recipe_markdown: cleanMarkdown,
      recipe_name: recipeName,
      nutrition: nutrition
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error generation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
