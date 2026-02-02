import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { platformApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_TOKEN_KEY = "platform_access_token";

type CompanyCreatePayload = {
  name: string;
  description?: string | null;
  admin_username: string;
  admin_password: string;
  admin_employee_name: string;
  admin_email?: string | null;
};

type CompanyCreateResponse = {
  company: { unique_id: string; name: string };
  company_admin: { unique_id: string; username: string };
};

type ProjectCreatePayload = {
  name: string;
  description?: string | null;
};

type ProjectCreateResponse = {
  project: { unique_id: string; name: string };
};

export default function PlatformConsole() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const platformUsername = useMemo(() => localStorage.getItem("platform_username") || "", []);

  const [companyName, setCompanyName] = useState("");
  const [companyDesc, setCompanyDesc] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminEmployeeName, setAdminEmployeeName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [createdCompanyId, setCreatedCompanyId] = useState<string>("");
  const [createdAdminUsername, setCreatedAdminUsername] = useState<string>("");

  const [projectCompanyId, setProjectCompanyId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);

  const logout = () => {
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
    localStorage.removeItem("platform_username");
    localStorage.removeItem("platform_unique_id");
    navigate("/platform/login", { replace: true });
  };

  const createCompany = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingCompany(true);

    try {
      const payload: CompanyCreatePayload = {
        name: companyName,
        description: companyDesc || null,
        admin_username: adminUsername,
        admin_password: adminPassword,
        admin_employee_name: adminEmployeeName,
        admin_email: adminEmail || null,
      };

      const res = await platformApi.post<CompanyCreateResponse>("/companies/", payload);

      setCreatedCompanyId(res.data.company.unique_id);
      setProjectCompanyId(res.data.company.unique_id);
      setCreatedAdminUsername(res.data.company_admin.username);

      toast({
        title: "Company created",
        description: `Company: ${res.data.company.unique_id} | Admin: ${res.data.company_admin.username}`,
      });
    } catch (error: any) {
      toast({
        title: "Create company failed",
        description: error?.response?.data?.detail || "Request failed",
        variant: "destructive",
      });
    } finally {
      setLoadingCompany(false);
    }
  };

  const createFirstProject = async (e: FormEvent) => {
    e.preventDefault();
    setLoadingProject(true);

    try {
      const companyId = projectCompanyId.trim();
      if (!companyId) {
        toast({
          title: "Company unique_id required",
          description: "Create a company first or paste a company unique_id.",
          variant: "destructive",
        });
        return;
      }

      const payload: ProjectCreatePayload = {
        name: projectName,
        description: projectDesc || null,
      };

      const res = await platformApi.post<ProjectCreateResponse>(
        `/companies/${encodeURIComponent(companyId)}/projects/first/`,
        payload,
      );

      toast({
        title: "First project created",
        description: `Project: ${res.data.project.unique_id}`,
      });
    } catch (error: any) {
      toast({
        title: "Create project failed",
        description: error?.response?.data?.detail || "Request failed",
        variant: "destructive",
      });
    } finally {
      setLoadingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Platform Console</h1>
            <p className="text-sm text-slate-300">
              Logged in as <span className="font-mono">{platformUsername || "(super admin)"}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/auth")}>Go to Staff Login</Button>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="bg-[#0b1222] border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-xl">Create Company + Company Admin</CardTitle>
              <CardDescription className="text-slate-300">
                Platform-only action. Creates the tenant and the initial company admin login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createCompany} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Company name</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-slate-200">Company description</Label>
                  <Input value={companyDesc} onChange={(e) => setCompanyDesc(e.target.value)} placeholder="Optional" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-slate-200">Admin username</Label>
                    <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-slate-200">Admin password</Label>
                    <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-slate-200">Admin employee name</Label>
                    <Input value={adminEmployeeName} onChange={(e) => setAdminEmployeeName(e.target.value)} required />
                  </div>
                  <div>
                    <Label className="text-slate-200">Admin email</Label>
                    <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <Button type="submit" disabled={loadingCompany} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  {loadingCompany ? "Creating..." : "Create company"}
                </Button>

                {(createdCompanyId || createdAdminUsername) && (
                  <div className="rounded-md border border-slate-800 bg-black/30 p-3 text-sm text-slate-200">
                    <div>
                      Company unique_id: <span className="font-mono">{createdCompanyId}</span>
                    </div>
                    <div>
                      Company admin username: <span className="font-mono">{createdAdminUsername}</span>
                    </div>
                    <div className="mt-2 text-slate-400">
                      Use these credentials on the normal IWMS staff login page.
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="bg-[#0b1222] border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-xl">Create First Project</CardTitle>
              <CardDescription className="text-slate-300">
                Platform-only. First project must be created by platform super admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createFirstProject} className="space-y-4">
                <div>
                  <Label className="text-slate-200">Company unique_id</Label>
                  <Input value={projectCompanyId} onChange={(e) => setProjectCompanyId(e.target.value)} placeholder="COMP..." required />
                </div>
                <div>
                  <Label className="text-slate-200">Project name</Label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-slate-200">Project description</Label>
                  <Input value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Optional" />
                </div>

                <Button type="submit" disabled={loadingProject} className="w-full bg-indigo-500 hover:bg-indigo-600">
                  {loadingProject ? "Creating..." : "Create first project"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
