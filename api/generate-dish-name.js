// api/translate.js
// Для Vercel Serverless Function с DeepSeek API

module.exports = async (req, res) => {
  // Убедимся, что это POST-запрос
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { text } = req.body;

  // Проверка на наличие текста для перевода
  if (!text) {
    return res.status(400).json({ error: "Текст для перевода обязателен." });
  }

  // --- ИЗМЕНЕНИЕ 1: Переменная окружения для DeepSeek API ключа ---
  // Используем новую переменную для ключа DeepSeek
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY не установлен!");
    return res.status(500).json({ error: "Ошибка конфигурации сервера: отсутствует API ключ DeepSeek." });
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", { // --- ИЗМЕНЕНИЕ 2: Базовый URL DeepSeek ---
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat", // --- ИЗМЕНЕНИЕ 3: Модель DeepSeek ---
        messages: [
          // Измените системное сообщение, чтобы оно соответствовало вашей задаче перевода
          // с русского на казахский, как мы делали ранее.
          { role: "system", content: "You are a helpful translator. Translate from Russian to Kazakh. Provide only the translated text." },
          { role: "user", content: `Translate the following Russian text to Kazakh: "${text}"` }
        ],
        max_tokens: 150, // Ограничьте длину ответа
      }),
    });

    // Проверяем статус ответа от DeepSeek API
    if (!response.ok) {
      const errorData = await response.json();
      console.error("DeepSeek API error:", response.status, errorData);
      return res.status(response.status).json({ error: errorData.error?.message || "Ошибка от DeepSeek API." });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
        console.error("DeepSeek response did not contain expected translation:", data);
        return res.status(500).json({ error: "Перевод не удался: DeepSeek не вернул контент." });
    }

    res.status(200).json({ result });

  } catch (error) {
    console.error("Непредвиденная ошибка при переводе с DeepSeek:", error);
    res.status(500).json({ error: "Произошла внутренняя ошибка сервера." });
  }
};
