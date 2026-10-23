package com.smartagenda.api;

import jakarta.servlet.http.HttpServletRequest;
import java.time.format.DateTimeParseException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  ResponseEntity<Map<String, String>> api(ApiException e) {
    return ResponseEntity.status(e.status()).body(Map.of("error", e.getMessage()));
  }

  /** Datos mal formados enviados por el cliente (número, fecha o JSON inválidos): es un 400, no un error del servidor. */
  @ExceptionHandler({ NumberFormatException.class, DateTimeParseException.class, HttpMessageNotReadableException.class,
      MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class,
      MissingServletRequestPartException.class })
  ResponseEntity<Map<String, String>> badRequest(Exception e, HttpServletRequest request) {
    log.warn("Pedido inválido en {} {}: {}", request.getMethod(), request.getRequestURI(), e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Datos con formato inválido"));
  }

  /** El pedido llegó con un tipo de contenido que ese endpoint no acepta (por ejemplo, JSON donde espera un archivo). */
  @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
  ResponseEntity<Map<String, String>> tipoNoSoportado(HttpMediaTypeNotSupportedException e) {
    return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of("error", "Tipo de contenido no soportado"));
  }

  /** Archivo más grande de lo que acepta el servidor (la foto de perfil tiene su propio límite, más justo, en el controlador). */
  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<Map<String, String>> archivoGrande(MaxUploadSizeExceededException e) {
    return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("error", "El archivo supera el tamaño máximo permitido"));
  }

  /** Pedido de carga de archivos mal formado (no es multipart, está cortado, etc.). */
  @ExceptionHandler(MultipartException.class)
  ResponseEntity<Map<String, String>> archivoInvalido(MultipartException e, HttpServletRequest request) {
    log.warn("Carga de archivo inválida en {} {}: {}", request.getMethod(), request.getRequestURI(), e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "No se pudo leer el archivo enviado"));
  }

  /** Error inesperado: se registra completo en el servidor y al cliente solo se le devuelve un mensaje genérico. */
  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> unexpected(Exception e, HttpServletRequest request) {
    log.error("Error inesperado en {} {}", request.getMethod(), request.getRequestURI(), e);
    return ResponseEntity.internalServerError().body(Map.of("error", "Error interno del servidor"));
  }
}
