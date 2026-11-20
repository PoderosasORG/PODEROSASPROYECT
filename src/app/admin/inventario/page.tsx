import { Proximamente } from "../Proximamente";

export default function Page() {
  return (
    <Proximamente
      title="Inventario"
      items={[
        "Productos físicos y de eventos (kits, libretas, merch) con existencias",
        "Cupos disponibles por evento",
        "Alertas cuando algo se esté acabando",
      ]}
    />
  );
}
