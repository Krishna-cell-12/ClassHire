import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_RESET: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  // Natural-language student search (Phase 3). All optional at boot -- the feature fails
  // cleanly (loud startup warning + per-request error) if the active provider's key is
  // unset, rather than blocking the whole server from starting over an optional feature.
  LLM_PROVIDER: z.enum(['groq', 'gemini']).default('groq'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('openai/gpt-oss-20b'),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
