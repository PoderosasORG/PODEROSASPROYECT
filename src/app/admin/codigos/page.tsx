import { Proximamente } from "../Proximamente";

export default function Page() {
  return (
    <Proximamente
      title="Códigos de regalo y cupones"
      items={[
        "Crear códigos de descuento (% o valor fijo) con fecha de vencimiento y cupo",
        "Códigos de regalo que dan acceso a un curso sin pagar",
        "Ver quién usó cada código (también aparece en el CRM)",
      ]}
    />
  );
}
