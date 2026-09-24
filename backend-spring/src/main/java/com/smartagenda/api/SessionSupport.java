package com.smartagenda.api;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
public final class SessionSupport { private SessionSupport() {} @SuppressWarnings("unchecked") public static Map<String,Object> user(HttpSession s) { Object u=s.getAttribute("user"); if (!(u instanceof Map<?,?>)) throw new ApiException(HttpStatus.UNAUTHORIZED,"No autenticado"); return (Map<String,Object>)u; } public static Map<String,Object> role(HttpSession s,String... roles) { Map<String,Object> u=user(s); for(String r:roles) if(r.equals(String.valueOf(u.get("rol")))) return u; throw new ApiException(HttpStatus.FORBIDDEN,"No tiene permisos para esta acción"); } public static int intValue(Map<String,Object> map,String key) { return ((Number)map.get(key)).intValue(); } }
