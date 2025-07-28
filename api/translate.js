export default async function handler(req, res) {
  const { text } = req.body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "No API key set" });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful translator. Translate from Russian to English." },
        { role: "user", content: text }
      ],
    }),
  });

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;
  res.status(200).json({ result });
}
