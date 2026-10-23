package com.smartagenda.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class TipoImagenTest {
  private static byte[] bytes(int... valores) {
    byte[] b = new byte[valores.length];
    for (int i = 0; i < valores.length; i++) b[i] = (byte) valores[i];
    return b;
  }

  @Test
  void reconocePorElContenidoLosTresFormatosPermitidos() {
    assertEquals("image/jpeg", TipoImagen.detectar(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10)));
    assertEquals("image/png", TipoImagen.detectar(bytes(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0)));
    assertEquals("image/webp", TipoImagen.detectar("RIFF....WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1)));
  }

  @Test
  void rechazaOtrosArchivosAunqueTenganNombreDeImagen() {
    assertNull(TipoImagen.detectar("<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8)));
    assertNull(TipoImagen.detectar("GIF89a......".getBytes(StandardCharsets.ISO_8859_1)));
    assertNull(TipoImagen.detectar("%PDF-1.4 ...".getBytes(StandardCharsets.ISO_8859_1)));
    assertNull(TipoImagen.detectar("MZ\u0090\u0000 ejecutable".getBytes(StandardCharsets.ISO_8859_1)));
    assertNull(TipoImagen.detectar("RIFF....WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1)));
  }

  @Test
  void rechazaArchivosVaciosOTruncados() {
    assertNull(TipoImagen.detectar(null));
    assertNull(TipoImagen.detectar(new byte[0]));
    assertNull(TipoImagen.detectar(bytes(0xFF, 0xD8)));
    assertNull(TipoImagen.detectar(bytes(0x89, 'P', 'N', 'G')));
  }
}
