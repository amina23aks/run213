import { ShopTheLookClient } from "@/components/home/ShopTheLookClient";
import { listActiveLookCollections, listHomepageLooks } from "@/lib/firestore/looks";

export async function ShopTheLook() {
  const [figures, collections] = await Promise.all([
    listHomepageLooks(4),
    listActiveLookCollections(4),
  ]);

  return <ShopTheLookClient figures={figures} collections={collections} />;
}
