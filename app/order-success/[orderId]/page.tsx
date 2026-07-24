import { redirect } from "next/navigation";

type Props = { params: Promise<{ orderId: string }> };
export default async function OrderSuccessPage({ params }: Props) {
  const { orderId } = await params;
  redirect(`/orders/${encodeURIComponent(orderId)}?status=success`);
}
