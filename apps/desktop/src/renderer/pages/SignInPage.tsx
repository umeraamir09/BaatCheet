import { SignIn } from "@clerk/clerk-react";

export function SignInPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
          },
        }}
      />
    </div>
  );
}
