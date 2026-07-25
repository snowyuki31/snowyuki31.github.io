import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // 章番号。命題・定義の採番 "命題2.2" の前半に使う（未指定なら通し番号のみ）
        section: z.number().optional(),
      }),
    }),
  }),
};
