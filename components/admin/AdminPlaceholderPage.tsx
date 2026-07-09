import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

type AdminPlaceholderPageProps = {
  title: string;
  label: string;
  description: string;
};

export function AdminPlaceholderPage({ title, label, description }: AdminPlaceholderPageProps) {
  return (
    <AdminShell title={title} description={description}>
      <AdminAccessGate>
        <section className="adminCard adminPlaceholderCard">
          <div className="adminCard__heading">
          <p>{label}</p>
          <h2>Coming in a later sprint</h2>
          <span>No fake data is shown here. This section will connect to real backend data when its sprint starts.</span>
          </div>
          <a className="adminPrimary adminPlaceholderCard__link" href="/admin/products">Back to products →</a>
        </section>
      </AdminAccessGate>
    </AdminShell>
  );
}
