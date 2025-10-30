import type {AEP, Sidebar} from "./types";

function buildSidebar(aeps: AEP[], groups: any, sidebar: Sidebar[]): Sidebar[] {
  let response = [];
  for (let group of groups.categories) {
    response.push({
      label: group.title,
      items: aeps
        .filter((aep) => aep.category == group.code)
        .sort((a1, a2) => (a1.id > a2.id ? 1 : -1))
        .map((aep) => ({
          label: `${aep.id}. ${aep.title}`,
          link: aep.id.toString(),
        })),
    });
  }

  return addToSidebar(sidebar, "AEPs", response);
}

function addToSidebar(sidebar: Sidebar[], label: string, items): Sidebar[] {
  const targetGroupIndex = sidebar.findIndex((group) => group.label === label);
  if (targetGroupIndex == -1) {
    sidebar.push({label: label, items: items});
  } else if (Array.isArray(sidebar[targetGroupIndex].items)) {
    sidebar[targetGroupIndex].items.push(...items);
  } else {
    sidebar[targetGroupIndex].items = items;
  }
  return sidebar;
}

export {
  buildSidebar,
  addToSidebar,
};
