export async function polishInsightsWithLLM(ruleBasedInsights, stats) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null; // AI polish disabled
    }

    const base = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const systemPrompt =
      'You are an assistant that rewrites existing organizational insights into smoother, human-friendly language. ' +
      'Keep content faithful to the original insights. Do NOT introduce new facts. Avoid technical graph terms. Keep it under 130 words.';

    const userPrompt = `You are given:\nRule-based insights about a workplace social graph and some collaboration statistics.\nYour job:\n- Rewrite and combine them into 3–5 concise bullet points\n- Keep content faithful\n- Do NOT introduce new facts\n- Avoid technical graph terms (degree, centrality, weighted edges)\n- Keep it under 130 words total\n\nRule-based insights (JSON):\n${JSON.stringify(ruleBasedInsights)}\n\nGraph stats (JSON):\n${JSON.stringify(stats)}`;

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return null;
    }

    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const bullets = lines
      .filter((l) => /^[-*•]/.test(l))
      .map((l) => l.replace(/^[-*•]\s*/, ''));

    return {
      summaryText: content.trim(),
      bullets,
    };
  } catch (_err) {
    return null; // Fail closed without impacting rule-based insights
  }
}
