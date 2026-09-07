import { formatDzd } from "@/constants/products";
import { getDeliveryModeRates } from "@/lib/orders/shipping";

type Props = { wilaya: string; name: string; variant: "checkout" | "drawer"; invalid?: boolean };

export function DeliveryModeOptions({ wilaya, name, variant, invalid }: Props) {
  const rates = wilaya ? getDeliveryModeRates(wilaya) : null;
  return <fieldset className={variant === "checkout" ? "checkoutDeliveryType checkoutDeliveryType--compact" : "drawerDeliveryMode"} aria-invalid={invalid}>
    <legend>Delivery mode</legend>
    <label><input type="radio" name={name} value="home" defaultChecked /><span><strong>Home</strong><small>Delivered to your address</small>{rates ? <b>{formatDzd(rates.homeDzd)}</b> : null}</span></label>
    <label className={rates?.deskDzd == null && rates ? "isUnavailable" : undefined}><input type="radio" name={name} value="desk" disabled={rates?.deskDzd == null && Boolean(rates)} /><span><strong>Desk</strong><small>Pick up at courier desk</small>{rates?.deskDzd != null ? <b>{formatDzd(rates.deskDzd)}</b> : rates ? <b>Unavailable</b> : null}</span></label>
  </fieldset>;
}
