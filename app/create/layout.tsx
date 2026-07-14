import { AnonymousSessionBootstrap } from "@/components/auth/anonymous-session-bootstrap";

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <AnonymousSessionBootstrap>{children}</AnonymousSessionBootstrap>;
}
