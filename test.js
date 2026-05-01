const apiKey = 'AIzaSyBd4a2wFkdDSKpiW0zpH05SVraCY7apj20';
const prompt = `Você é um guia de sonhos lúcidos. O usuário deseja incubar o seguinte tema de sonho: "Voando".
Por favor, gere um JSON com a seguinte estrutura estrita:
{
  "seed": "Uma 'Semente Sensorial' em português (2 a 3 parágrafos).",
  "image_prompt": "Um prompt em inglês otimizado para um gerador de imagens IA",
  "questions": [
    "5 perguntas dialéticas ou poéticas em português"
  ]
}
Responda APENAS com o JSON.`;

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: 'application/json' },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
    })
}).then(r => r.json()).then(console.log).catch(console.error);
