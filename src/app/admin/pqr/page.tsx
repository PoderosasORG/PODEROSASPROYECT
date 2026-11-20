import { Proximamente } from "../Proximamente";

export default function Page() {
  return (
    <Proximamente
      title="PQR y comentarios"
      items={[
        "Formulario de peticiones, quejas, reclamos y comentarios para las usuarias",
        "Bandeja con estado (nueva, en proceso, resuelta) y quién la atiende",
        "Respuesta por correo desde el panel",
      ]}
    />
  );
}
