import { IBotApp } from "@/components/ibot-app";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IBotApp />
      {children}
    </>
  );
}
