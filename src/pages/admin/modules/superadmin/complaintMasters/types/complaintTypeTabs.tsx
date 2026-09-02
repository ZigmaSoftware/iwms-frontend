/**
 * Route entry points for the three Complaint Types tabs.
 *
 * The encrypted router resolves a `{ list, form }` pair per screen key, so
 * each tab needs a list component and a form component. All six are the same
 * `ComplaintTypesScreen` with a different `kind`/`mode` — the tab strip is
 * rendered by the screen itself, so the active tab is derived from which route
 * matched rather than from component state.
 */
import ComplaintTypesScreen from "./ComplaintTypesScreen";

export const CategoryTabList = () => <ComplaintTypesScreen kind="category" mode="list" />;
export const CategoryTabForm = () => <ComplaintTypesScreen kind="category" mode="form" />;

export const SubcategoryTabList = () => (
  <ComplaintTypesScreen kind="subcategory" mode="list" />
);
export const SubcategoryTabForm = () => (
  <ComplaintTypesScreen kind="subcategory" mode="form" />
);

export const SlaTabList = () => <ComplaintTypesScreen kind="slaRule" mode="list" />;
export const SlaTabForm = () => <ComplaintTypesScreen kind="slaRule" mode="form" />;
