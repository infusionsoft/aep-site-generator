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

const SideBarItem = z.object({
  label: z.string(),
  collapsed: z.boolean().optional(),
  items: z.array(z.union([z.string(), z.lazy(() => SideBarItem)])),
});

const SidebarItems = z.array(SideBarItem);

interface Sidebar {
  label: string;
  link: string;
  icon: string;
  items: z.infer<typeof SidebarItems>;
}

interface AEP {
  title: string;
  id: string;
  frontmatter: object;
  contents: Markdown;
  category: string;
  order: number;
  slug: string;
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
  Sidebar,
};
