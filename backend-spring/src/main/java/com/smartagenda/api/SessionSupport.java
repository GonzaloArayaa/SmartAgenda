package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;

public final class SessionSupport {
  private SessionSupport() {}

  @SuppressWarnings("unchecked")
  public static Map<String, Object> user(HttpSession s) {
    Object u = s.getAttribute("user");
    if (!(u instanceof Map<?, ?>)) throw new ApiException(HttpStatus.UNAUTHORIZED, "No autenticado");
    return (Map<String, Object>) u;
  }

  public static Map<String, Object> role(HttpSession s, String... roles) {
    Map<String, Object> u = user(s);
    for (String r : roles) if (r.equals(String.valueOf(u.get("rol")))) return u;
    throw new ApiException(HttpStatus.FORBIDDEN, "No tiene permisos para esta acción");
  }

  public static int intValue(Map<String, Object> map, String key) {
    return ((Number) map.get(key)).intValue();
  }

  public static boolean isAdmin(Map<String, Object> user) {
    return "Administrador".equals(String.valueOf(user.get("rol")));
  }

  /**
   * Profesional sobre el que trabaja la operación: un profesional siempre opera sobre su propio
   * perfil (aunque el pedido traiga otro id); el administrador tiene que indicar cuál.
   */
  public static int professionalFor(Map<String, Object> user, Map<String, Object> body) {
    if (isAdmin(user)) {
      int id = AuthController.number(body, "idProfesional", 0);
      if (id <= 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Profesional requerido");
      return id;
    }
    Object own = user.get("idProfesional");
    if (!(own instanceof Number number)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "El usuario no tiene perfil profesional");
    }
    return number.intValue();
  }

  /** Un profesional solo puede modificar sus propios recursos; el administrador, cualquiera. */
  public static void requireOwner(Map<String, Object> user, int ownerProfessionalId) {
    if (isAdmin(user)) return;
    Object own = user.get("idProfesional");
    if (own instanceof Number number && number.intValue() == ownerProfessionalId) return;
    throw new ApiException(HttpStatus.FORBIDDEN, "No puede modificar recursos de otro profesional");
  }
}
