import { z } from "zod";
import type { Markdown } from "./markdown";

const Config = z.object({
  hero: z.object({
    buttons: z.array(
      z.object({
        text: z.string(),
        href: z.string(),
      }),
    ),
    shortcuts: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        button: z.object({
          text: z.string(),
          href: z.string(),
        }),
      }),
    ),
  }),
  site: z.object({
    ga_tag: z.string(),
  }),
  urls: z.object({
    site: z.string(),
    repo: z.string(),
  }),
});

type Config = z.infer<typeof Config>;

interface AEP {
  title: string;
  id: string;
  slug: string;
  frontmatter: object;
  contents: Markdown;
  category: string;
  order: number;
}

interface GroupFile {
  categories: Group[];
}

interface Group {
  code: string;
  title: string;
}

export type {
  AEP,
  Markdown,
  GroupFile,
  Group,
  Config,
};
