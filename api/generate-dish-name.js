// api/generate-dish-name.js
// Vercel Serverless Function (Node.js)

module.exports = async (req, res) => {
  // Убедимся, что это POST-запрос
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { description } = req.body;

  // Проверка на наличие описания
  if (!description) {
    return res.status(400).json({ error: "Описание блюда обязательно." });
  }

  // Получаем API-ключ из переменных окружения Vercel
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY не установлен!");
    return res.status(500).json({ error: "Ошибка конфигурации сервера: отсутствует API ключ." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Можно использовать "gpt-4" для лучшего качества, если у вас есть доступ
        messages: [
          {
            role: "system",
            content: `Ты кулинарный эксперт и мастер нейминга. Пользователь предоставит описание блюда. Твоя задача — предложить короткое, аппетитное и уместное название для этого блюда. Отвечай строго в формате:
            S <lang>ru|Название на русском<lang>kk|Название на казахском
            Например: 'S <lang>ru|Салат Биг-Мак<lang>kk|БИГ-МАК САЛАТЫ'
            Не добавляй никаких дополнительных слов или объяснений. Только требуемый формат.`,
          },
          {
            role: "user",
            content: `Описание блюда: "${description}"`,
          },
        ],
        temperature: 0.7, // Настройте креативность (от 0 до 1)
        max_tokens: 100,  // Ограничьте длину ответа
      }),
    });

    // Проверяем статус ответа от OpenAI
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Ошибка OpenAI API:", response.status, errorData);
      return res.status(response.status).json({ error: errorData.error?.message || "Ошибка от OpenAI API." });
    }

    const data = await response.json();
    let gptResponseContent = data.choices?.[0]?.message?.content;

    if (!gptResponseContent) {
      console.error("OpenAI не вернул ожидаемый контент:", data);
      return res.status(500).json({ error: "GPT не смог сгенерировать названия." });
    }

    // --- Изменения здесь: Парсинг ответа GPT ---
    const regex = /S <lang>ru\|([^<]+)<lang>kk\|([^<]+)/;
    const match = gptResponseContent.match(regex);

    let dishNameRu = "Название не найдено";
    let dishNameKz = "Атауы табылған жоқ";

    if (match && match[1] && match[2]) {
      dishNameRu = match[1].trim();
      dishNameKz = match[2].trim();
    } else {
      console.warn("GPT вернул неожиданный формат:", gptResponseContent);
      // Если формат не соответствует, можно попробовать взять весь ответ GPT как русский,
      // или добавить логику для перевода всего ответа, если формат нарушен.
      // Для простоты, пока оставим значения по умолчанию.
    }
    // --- Конец изменений в парсинге ---

    // Отправляем названия обратно на фронтенд
    res.status(200).json({ nameRu: dishNameRu, nameKz: dishNameKz });

  } catch (error) {
    console.error("Непредвиденная ошибка при запросе к GPT:", error);
    res.status(500).json({ error: "Произошла внутренняя ошибка сервера." });
  }
};
