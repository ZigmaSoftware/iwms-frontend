export type ListCompanyProjectContext = {
  companyId: string;
  projectId: string;
};

let activeContext: ListCompanyProjectContext = {
  companyId: "",
  projectId: "",
};

export const setListCompanyProjectContext = (
  context: ListCompanyProjectContext,
) => {
  activeContext = context;
};

export const getListCompanyProjectContext = () => activeContext;
