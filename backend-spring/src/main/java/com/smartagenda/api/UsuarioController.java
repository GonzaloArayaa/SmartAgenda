package com.smartagenda.api;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/usuarios") public class UsuarioController {
 private final JdbcTemplate jdbc; public UsuarioController(JdbcTemplate jdbc){this.jdbc=jdbc;}
 @GetMapping public List<Map<String,Object>> list(HttpSession s){SessionSupport.role(s,"Administrador");return jdbc.queryForList("SELECT u.idUsuario,u.nombre,u.apellido,u.email,u.telefono,u.estado,u.fechaRegistro,r.nombreRol rol FROM usuario u JOIN rol r ON u.idRol=r.idRol ORDER BY u.fechaRegistro DESC");}
 @PutMapping public Map<String,String> update(@RequestBody Map<String,Object>b,HttpSession s){SessionSupport.role(s,"Administrador");int id=AuthController.number(b,"idUsuario",0);if(id<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"ID de usuario requerido");List<String> fields=new ArrayList<>();List<Object> params=new ArrayList<>();for(String field:List.of("estado","idRol","nombre","apellido","telefono"))ProfesionalController.add(b,field,fields,params);if(fields.isEmpty())throw new ApiException(HttpStatus.BAD_REQUEST,"No hay datos para actualizar");params.add(id);jdbc.update("UPDATE usuario SET "+String.join(",",fields)+" WHERE idUsuario=?",params.toArray());return Map.of("message","Usuario actualizado correctamente");}
}
