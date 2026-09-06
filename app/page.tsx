import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <div style={{ padding: '40px' }}>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton userProfileUrl="https://safe-prawn-2987.accounts.dev/user" />
      </Show>
    </div>
  )
}