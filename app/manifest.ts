import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "213 RUN", short_name: "213 RUN", description: "213 RUN active streetwear and running lifestyle.",
    start_url: "/", scope: "/", display: "standalone", background_color: "#f5f1e8", theme_color: "#070807",
  };
}
