import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/stores";
import PublicStore from "@/components/PublicStore";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return { title: "Store not found · PehlaStore" };
  return {
    title: `${store.content.display_name} · ${store.content.tagline}`,
    description: store.content.bio.slice(0, 150),
    openGraph: { title: store.content.display_name, description: store.content.tagline },
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();
  return <PublicStore slug={store.slug} store={store.content} handle={store.handle} theme={store.theme} />;
}