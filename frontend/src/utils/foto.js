// Foto de perfil: límites (los mismos que valida el backend) y dirección de la imagen.

export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_BYTES = 2 * 1024 * 1024;

/** La versión va en la dirección: al cambiar la foto cambia la URL y el navegador no muestra la vieja. */
export const fotoUrl = (idUsuario, version) => `/api/usuarios/${idUsuario}/foto?v=${version}`;

/** Devuelve el motivo por el que no se acepta el archivo, o '' si está bien. */
export function validarFoto(archivo) {
  if (!archivo) return 'Elegí una imagen.';
  if (!FOTO_TIPOS.includes(archivo.type)) return 'Formato no permitido: usá una imagen JPG, PNG o WebP.';
  if (archivo.size > FOTO_MAX_BYTES) return 'La foto supera el máximo de 2 MB.';
  return '';
}
