import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <div style={{ padding: '40px' }}>
      <Show when="signed-out">
        <SignInButton /> <SignUpButton />
      </Show>
      <Show when="signed-in">
        <UserButton userProfileUrl="PASTE_LINK_ACCOUNT_PORTAL_KAMU_DISINI" />
      </Show>
    </div>
  )
}