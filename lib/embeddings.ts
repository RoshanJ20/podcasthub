/**
 * Azure OpenAI embeddings client for Podcast Hub v2.
 *
 * Generates text-embedding-3-large vectors (1536 dimensions) via Azure OpenAI.
 * Includes retry logic for transient failures (429/5xx).
 */

const API_VERSION = '2024-02-01';

interface EmbeddingOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Generates a vector embedding for the given text using Azure OpenAI.
 *
 * @param text - The input text to embed
 * @param options - Optional retry configuration
 * @returns A 1536-dimensional embedding vector
 * @throws Error if input is empty, config is missing, or API fails after retries
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  if (!text.trim()) throw new Error('Input text cannot be empty');

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? 'text-embedding-3-large';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing');
  }

  const { maxRetries = 3, retryDelayMs = 1000 } = options;
  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${API_VERSION}`;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: text }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0].embedding;
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000)
          );
          continue;
        }
      }

      throw new Error(`Embedding API error: ${response.status}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Embedding generation failed after retries');
}
