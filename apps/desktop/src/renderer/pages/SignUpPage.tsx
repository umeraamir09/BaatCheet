import { SignUp } from "@clerk/clerk-react";

export function SignUpPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-bg-primary)]">
      <SignUp
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
