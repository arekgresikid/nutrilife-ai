/// <reference types="@cloudflare/workers-types" />
export const onRequestGet: PagesFunction<{ POLLINATIONS_API_KEY: string }> = async (context) => {
  try {
    const urlObj = new URL(context.request.url);
    const prompt = urlObj.searchParams.get('prompt') || '';
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const width = urlObj.searchParams.get('width') || '800';
    const height = urlObj.searchParams.get('height') || '600';
    const nologo = urlObj.searchParams.get('nologo') || 'true';
    const apiKey = (context.env.POLLINATIONS_API_KEY || "").replace(/['"]+/g, '').trim();

    const encodedPrompt = encodeURIComponent(prompt.trim());
    let pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&nologo=${nologo}&model=zimage`;
    
    if (apiKey && apiKey.length > 5) {
      pollinationsUrl += `&key=${apiKey}`;
    }

    const response = await fetch(pollinationsUrl);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`AI Image Error: ${errorText}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000"
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: 500 });
  }
};
