import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const helper = await readFile("lib/cloudinary-delivery.ts", "utf8");
const productCard = await readFile("components/home/ProductCard.tsx", "utf8");
const gallery = await readFile("components/product/ProductGallery.tsx", "utf8");
const community = await readFile("components/community/CommunityImageFrame.tsx", "utf8");
const uploadRoute = await readFile("app/api/run-club/upload-signature/route.ts", "utf8");

test("delivery helper only transforms safe Cloudinary upload URLs", () => {
  assert.match(helper, /url\.protocol !== "https:"/);
  assert.match(helper, /url\.hostname !== "res\.cloudinary\.com"/);
  assert.match(helper, /const marker = "\/image\/upload\/"/);
  assert.match(helper, /deliveryPath\.startsWith\("s--"\)/);
  assert.match(helper, /"f_auto"/);
  assert.match(helper, /"q_auto"/);
  assert.match(helper, /c_\$\{crop\}/);
});

test("display contexts use distinct bounded delivery widths", () => {
  assert.match(helper, /productCard: 640/);
  assert.match(helper, /productDetail: 1440/);
  assert.match(helper, /productThumbnail: 240/);
  assert.match(helper, /communityFeed: 720/);
  assert.match(productCard, /CLOUDINARY_IMAGE_WIDTHS\.productCard/);
  assert.match(productCard, /sizes="\(max-width: 700px\) 50vw/);
  assert.match(gallery, /CLOUDINARY_IMAGE_WIDTHS\.productDetail/);
  assert.match(gallery, /CLOUDINARY_IMAGE_WIDTHS\.productThumbnail/);
  assert.match(community, /CLOUDINARY_IMAGE_WIDTHS\.communityFeed/);
});

test("upload signature and verification flows remain delivery-transform free", () => {
  assert.doesNotMatch(uploadRoute, /cloudinaryImageUrl|f_auto|q_auto/);
  assert.match(uploadRoute, /signCloudinaryParams/);
});
