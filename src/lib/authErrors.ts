// Supabase devuelve sus mensajes de error en inglés — el resto del
// sitio está en español, así que traducimos los más comunes.
export function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Todavía no confirmaste tu correo. Revisa tu bandeja de entrada.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese correo. Inicia sesión en vez de crear una nueva.";
  }
  if (message.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (message.includes("Unable to validate email address")) {
    return "Ese correo no parece válido.";
  }
  return message;
}
