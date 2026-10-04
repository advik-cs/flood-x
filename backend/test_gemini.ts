import fs from 'fs';

async function test() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log('No GEMINI_API_KEY');
        return;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
    });
    console.log(response.status);
}
test();
