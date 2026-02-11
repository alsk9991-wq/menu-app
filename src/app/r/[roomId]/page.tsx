import MenuClient from "./MenuClient";

export default async function Page(
  props: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await props.params;
  return <MenuClient roomId={roomId} />;
}
