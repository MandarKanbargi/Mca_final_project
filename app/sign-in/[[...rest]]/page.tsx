import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1e3a8a_0%,_#020617_45%)] z-0 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 z-20" />

      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  )
}
