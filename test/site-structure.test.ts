import { describe, it, expect } from "@jest/globals";
import {
  createEmptySiteStructure,
  addOverviewPage,
  addAEPEdition,
} from "../src/utils/site-structure";

describe("Site Structure", () => {
  it("should create an empty site structure", () => {
    const siteStructure = createEmptySiteStructure();
    expect(siteStructure.overview.pages.length).toBe(0);
    expect(Object.keys(siteStructure.aeps.editions).length).toBe(0);
  });

  it("should add overview pages", () => {
    let siteStructure = createEmptySiteStructure();
    siteStructure = addOverviewPage(siteStructure, {
      label: "contributing",
      link: "contributing",
    });
    expect(siteStructure.overview.pages.length).toBe(1);
    expect(siteStructure.overview.pages[0].label).toBe("contributing");
  });

  it("should add AEP edition", () => {
    let siteStructure = createEmptySiteStructure();
    const mockAEPs = [
      {
        id: "1",
        title: "Test AEP",
        slug: "test-aep",
        frontmatter: { state: "approved" },
        category: "design-patterns",
        order: 1,
        contents: null as any,
      },
    ];
    const mockGroups = {
      categories: [{ code: "design-patterns", title: "Design Patterns" }],
    };

    siteStructure = addAEPEdition(
      siteStructure,
      "general",
      mockAEPs,
      mockGroups,
    );

    expect(siteStructure.aeps.editions["general"]).toBeDefined();
    expect(siteStructure.aeps.editions["general"].categories.length).toBe(1);
    expect(
      siteStructure.aeps.editions["general"].categories[0].aeps.length,
    ).toBe(1);
  });
});
