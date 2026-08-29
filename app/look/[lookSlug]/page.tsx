import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LookDetailClient } from "@/components/look/LookDetailClient";
import { getActiveLookBySlug } from "@/lib/firestore/looks";
import type { Metadata } from "next";
import { cache } from "react";
import { publicPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type LookPageProps = { params: Promise<{ lookSlug: string }> };

const getPublicLook = cache(getActiveLookBySlug);

export async function generateMetadata({ params }: LookPageProps): Promise<Metadata> {
  const { lookSlug } = await params;
  const look = await getPublicLook(lookSlug);
  if (!look) return {};
  return publicPageMetadata({ title: `${look.name} Look`, description: look.description, pathname: `/look/${look.slug}`, image: look.heroImage.url });
}

export default async function LookPage({ params }: LookPageProps) {
  const { lookSlug } = await params;
  const look = await getPublicLook(lookSlug);
  if (!look) notFound();

  return (
    <>
      <Header />
      <main className="lookDetailPage"><LookDetailClient look={look} /></main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
