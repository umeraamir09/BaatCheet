import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://grand-koi-41.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
