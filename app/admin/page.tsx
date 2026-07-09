import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell title="Overview" description="Admin overview is a placeholder until the products flow is stable.">
      <AdminAccessGate>
        <section className="adminCard adminPlaceholderCard">
          <div className="adminCard__heading">
          <p>SPRINT SCOPE</p>
          <h2>Products first</h2>
          <span>Orders, analytics, favorites, wishlist, and settings stay placeholders in this sprint.</span>
          </div>
          <a className="adminPrimary adminPlaceholderCard__link" href="/admin/products">Open products →</a>
        </section>
      </AdminAccessGate>
    </AdminShell>
  );
}
