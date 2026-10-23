package com.smartagenda.api;

/**
 * Reconoce el tipo real de una imagen por sus primeros bytes. No se confía en la extensión ni en el
 * tipo que declara el navegador: un archivo renombrado a .jpg no pasa.
 */
final class TipoImagen {
  private TipoImagen() {}

  /** @return "image/jpeg", "image/png" o "image/webp"; null si no es ninguno de los tres */
  static String detectar(byte[] b) {
    if (b == null) return null;
    if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
    if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
        && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return "image/png";
    if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
        && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
    return null;
  }
}
