import { ShopTheLookClient } from "@/components/home/ShopTheLookClient";
import { listActiveLookCollections, listHomepageLooks } from "@/lib/firestore/looks";

export async function ShopTheLook() {
  const [figures, collections] = await Promise.all([
    listHomepageLooks(),
    listActiveLookCollections(4),
  ]);

  return <ShopTheLookClient figures={figures} collections={collections} />;
}
