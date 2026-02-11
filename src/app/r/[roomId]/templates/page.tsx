import TemplatesClient from "./TemplatesClient";

export default async function Page(props: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await props.params;
  return <TemplatesClient roomId={roomId} />;
}
