/**
 * Unit tests for the Azure OpenAI embeddings client.
 *
 * Tests cover:
 * - Successful embedding generation
 * - Empty input validation
 * - API error handling
 * - Retry logic for transient failures (429/500)
 * - Missing configuration
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();

describe('generateEmbedding', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = 'text-embedding-3-large';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns embedding vector for valid text', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    const mockEmbedding = Array(1536).fill(0.1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: mockEmbedding }] }),
    });

    const result = await generateEmbedding('hello world');
    expect(result).toHaveLength(1536);
    expect(result[0]).toBe(0.1);
  });

  it('calls Azure OpenAI endpoint with correct params', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: Array(1536).fill(0) }] }),
    });

    await generateEmbedding('test input');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('openai.azure.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'api-key': 'test-key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('test input'),
      })
    );
  });

  it('throws on API error', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(generateEmbedding('test', { maxRetries: 1 })).rejects.toThrow(
      'Embedding API error: 403'
    );
  });

  it('retries on transient failure (429)', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: Array(1536).fill(0) }] }),
      });

    const result = await generateEmbedding('test', {
      maxRetries: 2,
      retryDelayMs: 1,
    });
    expect(result).toHaveLength(1536);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws for empty input', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    await expect(generateEmbedding('')).rejects.toThrow('Input text cannot be empty');
  });

  it('throws for whitespace-only input', async () => {
    const { generateEmbedding } = await import('@/lib/embeddings');
    await expect(generateEmbedding('   ')).rejects.toThrow('Input text cannot be empty');
  });

  it('throws when Azure OpenAI config is missing', async () => {
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;

    // Force re-import to pick up new env
    vi.resetModules();
    const { generateEmbedding } = await import('@/lib/embeddings');
    await expect(generateEmbedding('test')).rejects.toThrow('Azure OpenAI configuration missing');
  });
});
