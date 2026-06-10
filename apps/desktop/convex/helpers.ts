import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function getUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "Unauthenticated — configure a 'convex' JWT template in the Clerk Dashboard " +
      "(https://dashboard.clerk.com) → JWT Templates → Add Template with name 'convex' " +
      "and Issuer set to your Convex URL"
    );
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not registered");
  return user._id;
}
