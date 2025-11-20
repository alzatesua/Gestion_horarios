// lee variables de entorno expuestas por Vite (prefijo VITE_)
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}
