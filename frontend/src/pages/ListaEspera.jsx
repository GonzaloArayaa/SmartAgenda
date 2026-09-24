import { useEffect, useState } from 'react';
import { listaEspera } from '../services/api';

const texto = { esperando: 'Esperando un turno', ofertada: 'Oferta disponible', aceptada: 'Turno reservado', vencida: 'Oferta vencida', cancelada: 'Solicitud cancelada' };

export default function ListaEspera() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function cargar(){ setLoading(true); try { const data=await listaEspera.getAll(); setItems(Array.isArray(data)?data:[]); } catch(e){setError(e.message);} finally{setLoading(false);} }
  useEffect(()=>{cargar();},[]);
  async function accion(id,accion){try{await listaEspera.update({idListaEspera:id,accion}); await cargar();}catch(e){setError(e.message);}}
  if(loading)return <div className="spinner"/>;
  return <div><div className="page-header"><div><h2><i className="fas fa-hourglass-half"></i> Lista de Espera</h2><p>Solicitudes para ocupar un turno que se libere por una cancelación.</p></div></div>
    {error&&<div className="auth-error">{error}</div>}
    {items.length===0?<div className="empty-state"><i className="fas fa-hourglass-start"></i><h3>No tenés solicitudes activas</h3><p>Cuando un día esté completo, podés anotarte desde la pantalla de reserva.</p></div>:<div className="table-container"><table className="table"><thead><tr><th>Profesional</th><th>Servicio</th><th>Fecha solicitada</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{items.map(i=><tr key={i.idListaEspera}><td>{i.nombreNegocio}</td><td>{i.servicio_nombre}</td><td>{i.fechaDeseada}</td><td><span className={`badge badge-${i.estado==='ofertada'?'confirmado':'pendiente'}`}>{texto[i.estado]||i.estado}</span>{i.estado==='ofertada'&&<small style={{display:'block',marginTop:4}}>Horario: {i.horaOferta}</small>}</td><td>{i.estado==='ofertada'?<button className="btn btn-primary btn-sm" onClick={()=>accion(i.idListaEspera,'aceptar')}>Aceptar turno</button>:['esperando','ofertada'].includes(i.estado)&&<button className="btn btn-outline btn-sm" onClick={()=>accion(i.idListaEspera,'cancelar')}>Cancelar</button>}</td></tr>)}</tbody></table></div>}</div>;
}
