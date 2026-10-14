import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { huecos } from '../services/api';
import { duracionTexto } from '../utils/huecos';
import { fechaLocal, fechaLocalEnDias } from '../utils/fecha';

// Resumen del tiempo libre que le queda al profesional hoy (Dashboard)
export default function HuecosHoy({ idProfesional }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let activo = true;
    huecos.get(idProfesional, fechaLocal(), fechaLocalEnDias(6))
      .then((respuesta) => { if (activo) setDatos(respuesta); })
      .catch(() => { if (activo) setDatos(null); });
    return () => { activo = false; };
  }, [idProfesional]);

  if (!datos) return null;
  const hoy = datos.dias[0];
  const proximo = datos.resumen.proximoHueco;
  const aprovechables = hoy.huecos.filter((hueco) => hueco.aprovechable);

  return (
    <section className="pro-huecos-card">
      <header className="pro-section-header">
        <div><span>HUECOS DE HOY</span><h3>Tiempo libre para reservar</h3></div>
        <Link to="/agenda">Ver agenda <i className="fas fa-arrow-right" /></Link>
      </header>

      {!hoy.atiende ? (
        <p className="pro-huecos-vacio"><i className="far fa-moon" /> Hoy no tenés horario de atención configurado.</p>
      ) : (
        <div className="pro-huecos-metricas">
          <div><span>Libre hoy</span><strong>{duracionTexto(hoy.minutosLibres)}</strong></div>
          <div><span>Aprovechable</span><strong>{duracionTexto(hoy.minutosAprovechables)}</strong></div>
          <div><span>Huecos cortos</span><strong>{duracionTexto(hoy.minutosMuertos)}</strong></div>
        </div>
      )}

      {hoy.atiende && aprovechables.length > 0 && (
        <ul className="pro-huecos-lista" aria-label="Huecos aprovechables de hoy">
          {aprovechables.map((hueco) => (
            <li key={hueco.horaInicio}><i className="far fa-clock" /> {hueco.horaInicio} – {hueco.horaFin}<small>{duracionTexto(hueco.duracionMin)}</small></li>
          ))}
        </ul>
      )}

      {hoy.atiende && aprovechables.length === 0 && (
        <p className="pro-huecos-vacio"><i className="far fa-calendar-check" /> No te quedan huecos aprovechables hoy.</p>
      )}

      {proximo && proximo.fecha !== fechaLocal() && aprovechables.length === 0 && (
        <p className="pro-huecos-proximo">Próximo hueco: <strong>{proximo.diaSemana} {proximo.fecha.slice(8, 10)}/{proximo.fecha.slice(5, 7)}, {proximo.horaInicio} – {proximo.horaFin}</strong></p>
      )}
    </section>
  );
}
