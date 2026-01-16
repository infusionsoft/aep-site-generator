import * as path from "node:path";
import {dump} from "js-yaml";

const ASIDES = {
  Important: { title: "Important", type: "caution" },
  Note: { title: "Note", type: "note" },
  "TL;DR": { title: "TL;DR", type: "tip" },
  Warning: { title: "Warning", type: "danger" },
  Summary: { title: "Summary" , type: "tip" },
};

const RULE_COLORS = {
  may: "font-extrabold text-green-700",
  "may not": "font-extrabold text-green-700",
  should: "font-extrabold	text-yellow-700",
  "should not": "font-extrabold	text-yellow-700",
  must: "font-extrabold	text-red-700",
  "must not": "font-extrabold	text-red-700",
};

interface Component {
  names: Array<string>;
  path: string;
}

/**
 * Represents an image asset found in the markdown that needs to be
 * processed and imported in the final MDX file.
 */
interface ImageAsset {
  /** The unique variable name used for the ESM import */
  variableName: string;
  /** The relative path used in the 'import' statement in MDX */
  importPath: string;
  /** The absolute path to the image in the source repository */
  sourceAbsolutePath: string;
  /** The absolute path where the image will be copied within the site generator */
  targetAbsolutePath: string;
}

class Markdown {
  contents: string;
  components: Array<Component>;
  frontmatter: object;
  /** List of images discovered during substitution that require processing */
  images: Array<ImageAsset> = [];

  constructor(contents: string, frontmatter: object) {
    this.contents = contents;
    this.components = [];
    this.frontmatter = frontmatter;
  }

  public addComponent(component: Component) {
    const existingComponentIndex = this.components.findIndex(
      (c) => c.path === component.path,
    );
    if (existingComponentIndex === -1) {
      this.components.push(component);
    } else {
      this.components[existingComponentIndex].names = [
        ...new Set([
          ...this.components[existingComponentIndex].names,
          ...component.names,
        ]),
      ];
    }
  }

  /**
   * Builds the final MDX string by combining frontmatter, image imports,
   * component imports, and the processed markdown content.
   *
   * @returns A string containing the full MDX file content.
   */
  public build(): string {
    const imageImports = this.images
      .map((img) => `import ${img.variableName} from '${img.importPath}';`)
      .join("\n");

    const componentImports = this.components.map((component) => {
      const isLibrary = !component.path.startsWith("@components") && !component.path.startsWith("/");
      if (isLibrary) {
        return `import { ${component.names.join(", ")} } from '${component.path}';`;
      } else {
        return `import ${component.names[0]} from '${component.path}';`;
      }
    }).join("\n");

    return `---
${dump(this.frontmatter)}
---
${imageImports}
${componentImports}

${this.contents}
`;
  }

  public substituteHTMLComments() {
    this.contents = this.contents.replaceAll(
      /<!--\s*([\s\S]*?)-->/g,
      (match, p1) => `{/* ${p1} */}`,
    );
    return this;
  }

  public substituteTabs() {
    let tab_regex =
      /\{% tab proto -?%\}([\s\S]*?)\{% tab oas -?%\}([\s\S]*?)\{% endtabs -?%\}/g;
    let tabs = [];

    let matches = this.contents.matchAll(tab_regex);
    for (let match of matches) {
      tabs.push({
        match: match[0],
        proto: tabContents(match[1]),
        oas: tabContents(match[2]),
      });
    }
    for (let tab of tabs) {
      let new_tab = `
<Tabs syncKey="exampleType">
  <TabItem label="OpenAPI 3.0">
${tab["oas"]}
  </TabItem>
</Tabs>
    `;
      this.contents = this.contents.replace(tab.match, new_tab);
    }
    return this;
  }

  public substituteSamples(folder: string) {
    let sample_regex = /\{% sample '(.*)', '(.*)', '(.*)' %}/g;
    let sample2_regex = /\{% sample '(.*)', '(.*)' %}/g;

    let samples = [];
    // TODO: Do actual sample parsing.
    const matches = this.contents.matchAll(sample_regex);
    for (let match of matches) {
      if (match[1].endsWith("proto") || match[1].endsWith("yaml")) {
        samples.push({
          match: match[0],
          filename: match[1],
          token1: match[2],
          token2: match[3],
        });
      }
    }

    const matches2 = this.contents.matchAll(sample2_regex);
    for (let match of matches2) {
      if (match[1].endsWith("proto") || match[1].endsWith("yaml")) {
        samples.push({
          match: match[0],
          filename: match[1],
          token1: match[2],
          token2: "",
        });
      }
    }

    for (let sample of samples) {
      let type = sample.filename.endsWith("proto") ? "protobuf" : "yml";
      let formatted_sample = `<Sample path="${path.join(folder, sample.filename)}" type="${type}" token1="${sample.token1}" token2="${sample.token2}" />`;
      this.contents = this.contents.replace(sample.match, formatted_sample);
    }
    return this;
  }

  public substituteLinks() {
    // Old site-generator expressed relative links as '[link]: ./0123'.
    // These should be expressed as '[link]: /123'

    this.contents = this.contents.replaceAll("]: ./", "]: /");
    this.contents = this.contents.replaceAll("]: /0", "]: /");
    return this;
  }

  public removeTitle() {
    // Title should be removed because Starlight will add it for us.
    this.contents = this.contents.replace(/# (.*)\n/, "");
    return this;
  }

  public substituteRuleIdentifiers() {
    const ruleRegex = /\*\*(should(?: not)?|may(?: not)?|must(?: not)?)\*\*/gi;
    const matches = this.contents.matchAll(ruleRegex);

    for (const match of matches) {
      // preserves original casing
      const originalText = match[1];
      // normalized for map lookup
      const lookupKey = originalText.toLowerCase();
      const color = RULE_COLORS[lookupKey];

      this.contents = this.contents.replace(
        match[0],
        `<b class="${color}">${originalText}</b>`,
      );
    }

    return this;
  }

  public substituteCallouts() {
    let paragraph_regex =
      /(^|\n)\*\*(Note|Warning|Important|Summary|TL;DR):\*\*([\s\S]+?)(?=\n{2,}|$)/g;
    let matches = this.contents.matchAll(paragraph_regex);
    for (let match of matches) {
      const aside_info = ASIDES[match[2]];
      const formatted_results = `
<Aside type="${aside_info.type}" title="${aside_info.title}">
${tabContents(match[3].trimStart())}
</Aside>`;
      this.contents = this.contents.replace(match[0], formatted_results);
    }
    this.addComponent({
      names: ["Aside"],
      path: "@astrojs/starlight/components",
    });
    return this;
  }

  public substituteEscapeCharacters() {
    this.contents = this.contents
      .replaceAll("<=", "\\<=")
      .replaceAll(">=", "\\>=");
    return this;
  }

  public substituteGraphviz() {
    this.contents = this.contents.replaceAll("```graphviz", "```dot");
    return this;
  }

  public substituteEBNF() {
    this.contents = this.contents.replaceAll("```ebnf", "```");
    return this;
  }

  public substituteAEPLinks() {
    // The original site generator knew to magically replace [Create][aep-133] style links with their matching links.
    // We now use the AepLink component to make these edition-aware.
    this.contents = this.contents.replaceAll(
      /\[([^\]]+)\]\[(aep-[^\]]+)\]/g,
      (match, first, second) => {
        const aepNumber = second.replace("aep-", ""); // Remove 'aep-' prefix
        return `<AepLink href="/${aepNumber}">${first}</AepLink>`;
      },
    );
    this.addComponent({
      names: ["AepLink"],
      path: "@components/AepLink.astro",
    });
    return this;
  }

  public substituteStandaloneAEPReferences() {
    // Convert standalone AEP references (case-insensitive) to edition-aware links
    // This matches "aep-XXX" where X is a number, but avoids matching within existing links
    this.contents = this.contents.replaceAll(/ (aep-\d+)\b/gi, (match, aepRef) => {
      const aepId = aepRef.replace(/^aep-/i, "");
      return ` <AepLink href="/${aepId}">${aepRef}</AepLink>`;
    });
    this.addComponent({
      names: ["AepLink"],
      path: "@components/AepLink.astro",
    });
    return this;
  }

  public substitutePlainAEPLinks() {
    // Convert plain markdown links to AEP numbers into AepLink components
    // Matches [text](/123) or [text](123) where 123 is a number
    this.contents = this.contents.replace(
      /\[([^\]]+)\]\(\/(\d+)\)/g,
      (match, text, aepNumber) => {
        return `<AepLink href="/${aepNumber}">${text}</AepLink>`;
      },
    );
    this.addComponent({
      names: ["AepLink"],
      path: "@components/AepLink.astro",
    });
    return this;
  }

  /**
   * Substitutes custom {% image %} tags with Astro <Image /> components.
   * It tracks the image metadata for copying and generates unique ESM imports
   * to ensure compatibility with Vite and the Astro image pipeline.
   *
   * @param folder - The absolute path to the folder containing the source markdown and its images.
   * @returns The Markdown instance for chaining.
   */
  public substituteImages(folder: string) {
    const imageRegex = /\{% image '(.*)', '(.*)' %}/g;
    let imageCounter = 0;

    this.contents = this.contents.replaceAll(imageRegex, (_match, filename, alt) => {
      const sourceAbsolutePath = path.join(folder, filename);
      const aepId = path.basename(folder);

      // Define where the file will be copied to within this repo
      const targetFilename = `${aepId}_${filename}`;
      const targetAbsolutePath = path.join(process.cwd(), "src/assets/generated", targetFilename);

      // Calculate relative path for the MDX 'import' statement
      const mdxDir = path.join(process.cwd(), "src/content/docs");
      let importPath = path.relative(mdxDir, targetAbsolutePath);
      if (!importPath.startsWith(".")) {
        importPath = "./" + importPath;
      }

      const variableName = `img_${imageCounter++}`;

      this.images.push({
        variableName,
        importPath,
        sourceAbsolutePath,
        targetAbsolutePath
      });

      return `<Image src={${variableName}} alt="${alt}" />`;
    });

    this.addComponent({
      names: ["Image"],
      path: "astro:assets",
    });

    return this;
  }
}

function buildMarkdown(contents: string, folder: string): Markdown {
  let result = new Markdown(contents, {});
  return result
    .substituteSamples(folder)
    .substituteTabs()
    .substituteHTMLComments()
    .substituteEscapeCharacters()
    .substituteCallouts()
    .substituteRuleIdentifiers()
    .removeTitle()
    .substituteLinks()
    .substituteGraphviz()
    .substituteEBNF()
    .substituteStandaloneAEPReferences()
    .substituteAEPLinks()
    .substitutePlainAEPLinks()
    .substituteImages(folder);
}

function tabContents(contents: string): string {
  return contents
    .split("\n")
    .map((x) => "  " + x)
    .join("\n");
}

export { Markdown, buildMarkdown };
