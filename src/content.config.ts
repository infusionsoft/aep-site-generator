import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { docsLoader } from "@astrojs/starlight/loaders";
import { blogSchema } from "starlight-blog/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: (context) => {
        return blogSchema(context).extend({
          isAEP: z.optional(z.boolean()),
          created: z.optional(z.date()),
          updated: z.optional(z.date()),
          id: z.optional(z.number()),
          state: z.optional(z.string()),
        });
      },
    }),
  }),
};
