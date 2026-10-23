package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Sesiones abiertas de cada usuario. Cuando un administrador le cambia el rol a alguien o lo
 * desactiva, se cierran sus sesiones: si no, seguiría operando con el rol viejo hasta salir solo.
 */
@Component
public class SesionesActivas implements HttpSessionListener {
  private final Map<Integer, Set<HttpSession>> porUsuario = new ConcurrentHashMap<>();

  public void registrar(int idUsuario, HttpSession sesion) {
    porUsuario.computeIfAbsent(idUsuario, id -> ConcurrentHashMap.newKeySet()).add(sesion);
  }

  public void cerrarSesionesDe(int idUsuario) {
    Set<HttpSession> sesiones = porUsuario.remove(idUsuario);
    if (sesiones == null) return;
    for (HttpSession sesion : sesiones) {
      try {
        sesion.invalidate();
      } catch (IllegalStateException yaCerrada) {
        // la sesión ya había terminado por su cuenta
      }
    }
  }

  @Override
  public void sessionDestroyed(HttpSessionEvent evento) {
    HttpSession cerrada = evento.getSession();
    porUsuario.values().forEach(set -> set.remove(cerrada));
    porUsuario.values().removeIf(Set::isEmpty);
  }
}
