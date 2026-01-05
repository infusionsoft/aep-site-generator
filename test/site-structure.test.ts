import { describe, it } from "../test/lib/index";
import {
  createEmptySiteStructure,
  addOverviewPage,
  addAEPEdition,
} from "../src/utils/site-structure";
import {
  assembleSidebarFromSiteStructure,
} from "../src/utils/sidebar-from-site-structure";

describe("Site Structure", () => {
  it("should create an empty site structure", () => {
    const siteStructure = createEmptySiteStructure();
    if (siteStructure.overview.pages.length !== 0) {
      throw new Error("Expected overview pages to be empty");
    }
    if (Object.keys(siteStructure.aeps.editions).length !== 0) {
      throw new Error("Expected AEPs editions to be empty");
    }
  });

  it("should add overview pages", () => {
    let siteStructure = createEmptySiteStructure();
    siteStructure = addOverviewPage(siteStructure, {
      label: "contributing",
      link: "contributing",
    });
    if (siteStructure.overview.pages.length !== 1) {
      throw new Error("Expected 1 overview page");
    }
    if (siteStructure.overview.pages[0].label !== "contributing") {
      throw new Error("Expected page label to be 'contributing'");
    }
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

    if (!siteStructure.aeps.editions["general"]) {
      throw new Error("Expected general edition to be set");
    }
    if (siteStructure.aeps.editions["general"].categories.length !== 1) {
      throw new Error("Expected 1 category");
    }
    if (
      siteStructure.aeps.editions["general"].categories[0].aeps.length !== 1
    ) {
      throw new Error("Expected 1 AEP in category");
    }
  });

  it("should assemble sidebar from site structure", () => {
    let siteStructure = createEmptySiteStructure();

    // Add some overview pages
    siteStructure = addOverviewPage(siteStructure, {
      label: "contributing",
      link: "contributing",
    });

    // Add some AEPs
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

    // Assemble sidebar
    const sidebar = assembleSidebarFromSiteStructure(siteStructure);

    if (sidebar.length !== 4) {
      throw new Error("Expected 4 sidebar sections");
    }

    const overviewSection = sidebar.find((s) => s.label === "Overview");
    if (!overviewSection) {
      throw new Error("Expected Overview section");
    }
    if (overviewSection.items.length !== 1) {
      throw new Error("Expected 1 item in Overview section");
    }

    const aepsSection = sidebar.find((s) => s.label === "AEPs");
    if (!aepsSection) {
      throw new Error("Expected AEPs section");
    }
    if (aepsSection.items.length !== 1) {
      throw new Error("Expected 1 category in AEPs section");
    }
  });
});
