package com.smartagenda.api;

import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final JdbcTemplate jdbc;
  private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();
  public AuthController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @PostMapping("/login") public Map<String,Object> login(@RequestBody Map<String,Object> body, HttpSession session) {
    String email = text(body,"email"), password = text(body,"contrasena");
    if (email.isBlank() || password.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"Email y contraseña son requeridos");
    Map<String,Object> dbUser;
    try { dbUser = jdbc.queryForMap("SELECT u.idUsuario,u.nombre,u.apellido,u.email,u.contrasena,u.telefono,u.estado,r.nombreRol rol,p.idProfesional,p.nombreNegocio FROM usuario u JOIN rol r ON u.idRol=r.idRol LEFT JOIN profesional p ON p.idUsuario=u.idUsuario WHERE u.email=?",email); }
    catch (org.springframework.dao.EmptyResultDataAccessException e) { throw new ApiException(HttpStatus.UNAUTHORIZED,"Credenciales incorrectas"); }
    if (!"activo".equals(dbUser.get("estado"))) throw new ApiException(HttpStatus.FORBIDDEN,"Cuenta deshabilitada. Contacte al administrador.");
    String hash = String.valueOf(dbUser.get("contrasena")).replace("$2y$", "$2a$");
    if (!passwords.matches(password,hash)) throw new ApiException(HttpStatus.UNAUTHORIZED,"Credenciales incorrectas");
    dbUser.remove("contrasena"); session.setAttribute("user",dbUser);
    return Map.of("message","Inicio de sesión exitoso","user",dbUser);
  }

  @PostMapping("/register") public Map<String,Object> register(@RequestBody Map<String,Object> body) {
    String nombre=text(body,"nombre"), apellido=text(body,"apellido"), email=text(body,"email"), pass=text(body,"contrasena"), telefono=text(body,"telefono"), rol=textOr(body,"rol","Cliente");
    if(nombre.isBlank()||apellido.isBlank()||email.isBlank()||pass.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,"Todos los campos obligatorios deben completarse");
    if(pass.length()<6) throw new ApiException(HttpStatus.BAD_REQUEST,"La contraseña debe tener al menos 6 caracteres");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE email=?",Integer.class,email)>0) throw new ApiException(HttpStatus.CONFLICT,"El email ya está registrado");
    Integer rolId; try { rolId=jdbc.queryForObject("SELECT idRol FROM rol WHERE nombreRol=?",Integer.class,rol); } catch(org.springframework.dao.EmptyResultDataAccessException e) { throw new ApiException(HttpStatus.BAD_REQUEST,"Rol no válido"); }
    jdbc.update("INSERT INTO usuario(nombre,apellido,email,contrasena,telefono,idRol) VALUES(?,?,?,?,?,?)",nombre,apellido,email,passwords.encode(pass),telefono,rolId);
    Integer id=jdbc.queryForObject("SELECT idUsuario FROM usuario WHERE email=?",Integer.class,email);
    if("Profesional".equals(rol)) { String negocio=textOr(body,"nombreNegocio",nombre+" - Profesional"); String descripcion=text(body,"descripcion"); int rubro=number(body,"idRubro",1); jdbc.update("INSERT INTO profesional(nombreNegocio,descripcion,idRubro,idUsuario) VALUES(?,?,?,?)",negocio,descripcion,rubro,id); }
    return Map.of("message","Registro exitoso","idUsuario",id);
  }
  @PostMapping("/logout") public Map<String,String> logout(HttpSession s) { s.invalidate(); return Map.of("message","Sesión cerrada correctamente"); }
  @GetMapping("/check") public Map<String,Object> check(HttpSession s) { Object u=s.getAttribute("user"); return u==null?Map.of("authenticated",false):Map.of("authenticated",true,"user",u); }
  static String text(Map<String,Object>b,String k){return textOr(b,k,"");} static String textOr(Map<String,Object>b,String k,String d){Object v=b.get(k);return v==null?d:String.valueOf(v).trim();} static int number(Map<String,Object>b,String k,int d){Object v=b.get(k);return v instanceof Number n?n.intValue():v==null?d:Integer.parseInt(String.valueOf(v));}
}
