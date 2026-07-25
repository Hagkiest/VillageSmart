import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { ResidentQuery } from "./pages/ResidentQuery";
import { NewResident } from "./pages/NewResident";
import { WorkInfo } from "./pages/WorkInfo";
import { RiskCheck } from "./pages/RiskCheck";
import { LowIncome } from "./pages/LowIncome";
import { LowIncomeForm } from "./pages/LowIncomeForm";
import { Disabled } from "./pages/Disabled";
import { DisabledForm } from "./pages/DisabledForm";
import { CareObjects } from "./pages/CareObjects";
import { CareObjectForm } from "./pages/CareObjectForm";
import { OrgStructure } from "./pages/OrgStructure";
import { OrgStructureForm } from "./pages/OrgStructureForm";
import { PartyMembers } from "./pages/PartyMembers";
import { PartyMemberForm } from "./pages/PartyMemberForm";
import { PartyFeeRecords } from "./pages/PartyFeeRecords";
import { Todos } from "./pages/Todos";
import { TodoForm } from "./pages/TodoForm";
import { Projects } from "./pages/Projects";
import { ProjectForm } from "./pages/ProjectForm";
import { Subsidies } from "./pages/Subsidies";
import { SubsidyForm } from "./pages/SubsidyForm";
import { PublicJobs } from "./pages/PublicJobs";
import { PublicJobForm } from "./pages/PublicJobForm";
import { Mediation } from "./pages/Mediation";
import { MediationForm } from "./pages/MediationForm";
import { Farmland } from "./pages/Farmland";
import { LandMap } from "./pages/LandMap";
import { RoleManagement } from "./pages/RoleManagement";
import { RoleForm } from "./pages/RoleForm";
import { UserManagement } from "./pages/UserManagement";
import { UserForm } from "./pages/UserForm";
import { Activation } from "./pages/Activation";
import { UISettings } from "./pages/UISettings";
import { DataSecurity } from "./pages/DataSecurity";
import { OperationLog } from "./pages/OperationLog";
import { ReminderRules } from "./pages/ReminderRules";

// ── placeholder for pages without a dedicated design ─────────────────────────
function Placeholder({ title }: { title: string }) {
  return (
    <div
      className="bg-white rounded border flex items-center justify-center py-24"
      style={{ borderColor: "#e4e7ed" }}
    >
      <p className="text-sm" style={{ color: "#c0c4cc" }}>{title} 功能建设中</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "residents", Component: ResidentQuery },
      { path: "residents/new", Component: NewResident },
      { path: "work-info", Component: WorkInfo },
      { path: "risk-check", Component: RiskCheck },
      { path: "low-income", Component: LowIncome },
      { path: "low-income/new", Component: LowIncomeForm },
      { path: "low-income/:id/edit", Component: LowIncomeForm },
      { path: "low-income/:id/detail", Component: LowIncomeForm },
      { path: "disabled", Component: Disabled },
      { path: "disabled/new", Component: DisabledForm },
      { path: "disabled/:id/edit", Component: DisabledForm },
      { path: "disabled/:id/detail", Component: DisabledForm },
      { path: "care-objects", Component: CareObjects },
      { path: "care-objects/new", Component: CareObjectForm },
      { path: "care-objects/:id/edit", Component: CareObjectForm },
      { path: "care-objects/:id/detail", Component: CareObjectForm },
      { path: "org-structure", Component: OrgStructure },
      { path: "org-structure/new", Component: OrgStructureForm },
      { path: "org-structure/:id/edit", Component: OrgStructureForm },
      { path: "org-structure/:id/detail", Component: OrgStructureForm },
      { path: "party-members", Component: PartyMembers },
      { path: "party-members/new", Component: PartyMemberForm },
      { path: "party-members/:id/edit", Component: PartyMemberForm },
      { path: "party-members/:id/detail", Component: PartyMemberForm },
      { path: "party-members/fees", Component: PartyFeeRecords },
      { path: "todos", Component: Todos },
      { path: "todos/new", Component: TodoForm },
      { path: "todos/:id/edit", Component: TodoForm },
      { path: "todos/:id/detail", Component: TodoForm },
      { path: "projects", Component: Projects },
      { path: "projects/new", Component: ProjectForm },
      { path: "projects/:id/edit", Component: ProjectForm },
      { path: "projects/:id/detail", Component: ProjectForm },
      { path: "subsidies", Component: Subsidies },
      { path: "subsidies/new", Component: SubsidyForm },
      { path: "subsidies/:id/edit", Component: SubsidyForm },
      { path: "subsidies/:id/detail", Component: SubsidyForm },
      { path: "public-jobs", Component: PublicJobs },
      { path: "public-jobs/new", Component: PublicJobForm },
      { path: "public-jobs/:id/edit", Component: PublicJobForm },
      { path: "public-jobs/:id/detail", Component: PublicJobForm },
      { path: "mediation", Component: Mediation },
      { path: "mediation/new", Component: MediationForm },
      { path: "mediation/:id/edit", Component: MediationForm },
      { path: "mediation/:id/detail", Component: MediationForm },
      { path: "reports", Component: () => <Placeholder title="报表中心" /> },
      { path: "documents", Component: () => <Placeholder title="文档管理" /> },
      { path: "farmland", Component: Farmland },
      { path: "land-map", Component: LandMap },
      { path: "tools", Component: () => <Placeholder title="实用工具" /> },
      { path: "roles", Component: RoleManagement },
      { path: "roles/new", Component: RoleForm },
      { path: "roles/:id/edit", Component: RoleForm },
      { path: "users", Component: UserManagement },
      { path: "users/new", Component: UserForm },
      { path: "users/:id/edit", Component: UserForm },
      { path: "activation", Component: Activation },
      {
        path: "settings",
        children: [
          { path: "security", Component: DataSecurity },
          { path: "rules", Component: ReminderRules },
          { path: "ui", Component: UISettings },
          { path: "logs", Component: OperationLog },
        ],
      },
    ],
  },
]);
