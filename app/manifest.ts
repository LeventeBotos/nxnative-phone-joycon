import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Phone Joy-Con",
    short_name: "Joy-Con",
    start_url: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
  };
}
