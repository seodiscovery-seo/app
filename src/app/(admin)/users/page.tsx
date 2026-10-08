import type { Metadata } from "next";
import { ROLE_LABELS, type UserRole } from "@/config/constants";
import { requireUserPage } from "@/lib/auth/dal";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { listUsers } from "@/server/services/user.service";
import { pendingUserIds } from "@/lib/auth/tokens";
import { NewUserForm, UserRowForm } from "./user-forms";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUserPage(["ADMIN"]);
  const [users, pending] = await Promise.all([listUsers(), pendingUserIds()]);
  return (
    <>
      <PageHeader title="Users" description="Admins can change everything. Viewers can see emails, logs and the block list, but can't change or send anything." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="card divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className={cn("p-4", !u.isActive && "bg-paper/50")}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials(u.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {u.name} {u.id === me.id && <span className="text-xs font-normal text-muted">(you)</span>}
                    {pending.has(u.id) && <span className="chip ml-2 bg-signal-soft text-[#a4480b]">Waiting for email confirmation</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {u.email} · {ROLE_LABELS[u.role as UserRole] ?? u.role}
                    {!u.isActive && " · inactive"} · last sign-in {formatDateTime(u.lastLoginAt)}
                  </p>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted hover:text-ink">Change role, access or password</summary>
                <div className="mt-3">
                  <UserRowForm user={{ id: u.id, role: u.role, isActive: u.isActive }} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <aside className="card h-fit p-5">
          <h2 className="section-title">Add a user</h2>
          <div className="mt-3">
            <NewUserForm />
          </div>
        </aside>
      </div>
    </>
  );
}
