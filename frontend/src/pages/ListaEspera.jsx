import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listaEspera } from '../services/api';

const texto = { esperando: 'Esperando un turno', ofertada: 'Oferta disponible', aceptada: 'Turno reservado', vencida: 'Oferta vencida', cancelada: 'Solicitud cancelada' };

export default function ListaEspera() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  async function cargar(){ setLoading(true); try { const data=await listaEspera.getAll(); setItems(Array.isArray(data)?data:[]); } catch(e){setError(e.message);} finally{setLoading(false);} }
  useEffect(()=>{cargar();},[]);
  async function accion(id,accion){try{await listaEspera.update({idListaEspera:id,accion}); await cargar();}catch(e){setError(e.message);}}
  if(loading)return <div className="spinner"/>;
  const ofertas = items.filter((i) => i.estado === 'ofertada').length;
  const esperando = items.filter((i) => i.estado === 'esperando').length;
  return <div className="waitlist-page client-module-page">
    <section className="waitlist-hero"><div><span className="client-kicker">OPORTUNIDADES DE RESERVA</span><h2>Lista de espera</h2><p>Seguí tus solicitudes y aprovechá automáticamente los horarios que se liberen.</p></div><div className="waitlist-hero-stats"><div><strong>{esperando}</strong><span>esperando</span></div><div><strong>{ofertas}</strong><span>ofertas</span></div></div></section>
    <aside className="waitlist-explainer"><div><i className="fas fa-bell" /></div><p><strong>¿Cómo funciona?</strong><span>Cuando se libera un turno compatible, tenés 10 minutos para aceptar la oferta antes de que pase a otra persona.</span></p></aside>
    {error&&<div className="auth-error"><i className="fas fa-exclamation-circle" /> {error}</div>}
    {items.length===0
      ? <section className="client-empty-state"><div><i className="far fa-bell" /></div><h3>No tenés solicitudes activas</h3><p>Si un horario está completo, podés sumarte a la espera desde la pantalla de reserva.</p><Link to="/buscar">Buscar profesionales</Link></section>
      : <section className="waitlist-cards"><header><div><span>SOLICITUDES</span><h3>Seguimiento de espera</h3></div><small>{items.length} activas e históricas</small></header><div className="waitlist-card-list">{items.map(i=>{
          const fecha=new Date(`${i.fechaDeseada}T12:00:00`);
          return <article key={i.idListaEspera} className={`waitlist-card waitlist-${i.estado}`}>
            <div className="waitlist-date"><strong>{fecha.getDate()}</strong><span>{fecha.toLocaleDateString('es-AR',{month:'short'}).toUpperCase()}</span></div>
            <div className="waitlist-info"><span>{i.servicio_nombre || 'Servicio'}</span><h3>{i.nombreNegocio || 'Profesional'}</h3><p>{i.estado==='ofertada'?<><i className="far fa-clock" /> Horario ofrecido: {String(i.horaOferta || '').slice(0,5)}</>:<>Te avisaremos si aparece un horario disponible.</>}</p></div>
            <div className="waitlist-state"><span className={`badge badge-${i.estado==='ofertada'?'confirmado':'pendiente'}`}>{texto[i.estado]||i.estado}</span></div>
            <div className="waitlist-actions">{i.estado==='ofertada'?<><button className="accept" onClick={()=>accion(i.idListaEspera,'aceptar')}><i className="fas fa-check" /> Aceptar</button><button onClick={()=>accion(i.idListaEspera,'cancelar')}>Cancelar</button></>:i.estado==='esperando'?<button onClick={()=>accion(i.idListaEspera,'cancelar')}>Cancelar solicitud</button>:<span>Sin acciones</span>}</div>
          </article>;
        })}</div></section>}
  </div>;
}
