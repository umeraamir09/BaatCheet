import { mutation } from "./_generated/server";
import { getUserId } from "./helpers";

export const generateUploadUrl = mutation(async (ctx) => {
  await getUserId(ctx);
  return await ctx.storage.generateUploadUrl();
});
