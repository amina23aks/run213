import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LookDetailClient } from "@/components/look/LookDetailClient";
import { getActiveLookBySlug } from "@/lib/firestore/looks";

export const dynamic = "force-dynamic";

type LookPageProps = { params: Promise<{ lookSlug: string }> };

export default async function LookPage({ params }: LookPageProps) {
  const { lookSlug } = await params;
  const look = await getActiveLookBySlug(lookSlug);
  if (!look) notFound();

  return (
    <>
      <Header />
      <main className="lookDetailPage"><LookDetailClient look={look} /></main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
