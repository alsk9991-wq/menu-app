import JoinClient from "./JoinClient";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <JoinClient roomId={roomId} />;
}
