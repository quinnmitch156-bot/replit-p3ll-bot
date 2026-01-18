import { z } from 'zod';
import { insertUserSchema, insertKeySchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    get: {
      method: 'GET' as const,
      path: '/api/users/:discordId',
      responses: {
        200: insertUserSchema.extend({
          id: z.number(),
          subscriptionExpiresAt: z.string().nullable(),
          createdAt: z.string()
        }),
        404: errorSchemas.notFound,
      },
    },
    sync: {
      method: 'POST' as const,
      path: '/api/users/sync',
      input: z.object({
        discordId: z.string(),
        username: z.string(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    }
  },
  keys: {
    generate: {
      method: 'POST' as const,
      path: '/api/keys/generate',
      input: z.object({
        type: z.enum(['lifetime', 'monthly', 'weekly']),
        amount: z.number().min(1).max(100).default(1),
      }),
      responses: {
        201: z.array(z.object({
          key: z.string(),
          type: z.string(),
        })),
        403: errorSchemas.internal, // Not admin
      },
    },
    redeem: {
      method: 'POST' as const,
      path: '/api/keys/redeem',
      input: z.object({
        key: z.string(),
        discordId: z.string(),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          expiresAt: z.string().nullable(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalUsers: z.number(),
          activeSubs: z.number(),
          totalLookups: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
