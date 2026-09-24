package com.smartagenda.api;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/profesionales") public class ProfesionalController {
  private final JdbcTemplate jdbc; public ProfesionalController(JdbcTemplate jdbc){this.jdbc=jdbc;}
  @GetMapping public Object list(@RequestParam(required=false) Integer id,@RequestParam(required=false) Integer idUsuario,@RequestParam(required=false) String buscar,@RequestParam(required=false) Integer idRubro){
    String select="SELECT p.*,r.nombre rubro,u.nombre,u.apellido,u.email,u.telefono FROM profesional p JOIN rubro r ON p.idRubro=r.idRubro JOIN usuario u ON p.idUsuario=u.idUsuario ";
    if(id!=null) return one(select+"WHERE p.idProfesional=?",id,"Profesional no encontrado");
    if(idUsuario!=null)return one(select+"WHERE p.idUsuario=?",idUsuario,"Perfil profesional no encontrado");
    List<Object> p=new ArrayList<>(); StringBuilder sql=new StringBuilder(select+"WHERE u.estado='activo'");
    if(buscar!=null&&!buscar.isBlank()){sql.append(" AND (p.nombreNegocio LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ? OR r.nombre LIKE ?)");String t="%"+buscar+"%";p.add(t);p.add(t);p.add(t);p.add(t);} if(idRubro!=null){sql.append(" AND p.idRubro=?");p.add(idRubro);} sql.append(" ORDER BY p.nombreNegocio"); return jdbc.queryForList(sql.toString(),p.toArray());
  }
  @PostMapping public Map<String,Object> create(@RequestBody Map<String,Object>b,HttpSession s){Map<String,Object>u=SessionSupport.user(s);String negocio=AuthController.text(b,"nombreNegocio");int rubro=AuthController.number(b,"idRubro",0);if(negocio.isBlank()||rubro==0)throw new ApiException(HttpStatus.BAD_REQUEST,"Nombre del negocio y rubro son requeridos");int user=SessionSupport.intValue(u,"idUsuario");if(jdbc.queryForObject("SELECT COUNT(*) FROM profesional WHERE idUsuario=?",Integer.class,user)>0)throw new ApiException(HttpStatus.CONFLICT,"Ya tiene un perfil profesional");jdbc.update("INSERT INTO profesional(nombreNegocio,descripcion,idRubro,idUsuario) VALUES(?,?,?,?)",negocio,AuthController.text(b,"descripcion"),rubro,user);jdbc.update("UPDATE usuario SET idRol=(SELECT idRol FROM rol WHERE nombreRol='Profesional') WHERE idUsuario=?",user);return Map.of("message","Perfil profesional creado","id",jdbc.queryForObject("SELECT idProfesional FROM profesional WHERE idUsuario=?",Integer.class,user));}
  @PutMapping public Map<String,String> update(@RequestBody Map<String,Object>b,HttpSession s){Map<String,Object>u=SessionSupport.role(s,"Profesional","Administrador");int id=AuthController.number(b,"idProfesional",u.get("idProfesional")==null?0:((Number)u.get("idProfesional")).intValue());if(id<=0)throw new ApiException(HttpStatus.BAD_REQUEST,"ID requerido");List<Object>p=new ArrayList<>();List<String>f=new ArrayList<>();add(b,"nombreNegocio",f,p);add(b,"descripcion",f,p);add(b,"idRubro",f,p);if(f.isEmpty())throw new ApiException(HttpStatus.BAD_REQUEST,"No hay datos para actualizar");p.add(id);jdbc.update("UPDATE profesional SET "+String.join(",",f)+" WHERE idProfesional=?",p.toArray());return Map.of("message","Perfil profesional actualizado");}
  private Object one(String sql,int id,String error){try{return jdbc.queryForMap(sql,id);}catch(org.springframework.dao.EmptyResultDataAccessException e){throw new ApiException(HttpStatus.NOT_FOUND,error);}}
  static void add(Map<String,Object>b,String k,List<String>f,List<Object>p){if(b.containsKey(k)){f.add(k+"=?");p.add(b.get(k));}}
}
