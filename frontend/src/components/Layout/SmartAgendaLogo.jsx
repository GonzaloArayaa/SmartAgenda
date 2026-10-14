import { useEffect, useState } from 'react';
import { LOGO_COLORS, LOGO_PATHS, LOGO_VIEWBOX } from './smartAgendaLogoPaths';

// Secuencia: la aguja oscila 1,2 s, pausa breve y un destello recorre el texto 1,5 s.
// Los tiempos coinciden con las animaciones .brand-logo-* de index.css.
const SEQUENCE_MS = 1200 + 150 + 1500;
// Reposo entre secuencias, contado desde que termina la anterior.
const REST_MS = 20 * 1000;

// Estado compartido por sesión: si la barra lateral se vuelve a montar al navegar,
// no reinicia la secuencia sino que respeta el próximo turno ya programado.
let nextPlayAt = null;

// eslint-disable-next-line react-refresh/only-export-components
export function resetLogoAnimation() {
  nextPlayAt = null;
}

window.addEventListener('smartagenda:sesion-vencida', resetLogoAnimation);

function useLogoSequence() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let waitTimer = null;
    let endTimer = null;
    let pendingVisible = false;

    function scheduleNext(delay) {
      clearTimeout(waitTimer);
      waitTimer = setTimeout(play, delay);
    }

    function play() {
      if (reducedMotion.matches) {
        // Movimiento reducido: el logo queda estático.
        nextPlayAt = Date.now() + REST_MS;
        scheduleNext(REST_MS);
        return;
      }
      if (document.hidden) {
        // Pestaña oculta: una sola secuencia al volver, sin acumular las atrasadas.
        pendingVisible = true;
        return;
      }
      nextPlayAt = Date.now() + SEQUENCE_MS + REST_MS;
      setPlaying(true);
      endTimer = setTimeout(() => {
        setPlaying(false);
        nextPlayAt = Date.now() + REST_MS;
        scheduleNext(REST_MS);
      }, SEQUENCE_MS);
    }

    function handleVisibility() {
      if (!document.hidden && pendingVisible) {
        pendingVisible = false;
        play();
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    scheduleNext(nextPlayAt === null ? 0 : Math.max(0, nextPlayAt - Date.now()));

    return () => {
      clearTimeout(waitTimer);
      clearTimeout(endTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return playing;
}

export default function SmartAgendaLogo() {
  const playing = useLogoSequence();

  return (
    <svg
      className={`brand-logo${playing ? ' is-playing' : ''}`}
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label="SmartAgenda Pro"
      focusable="false"
    >
      <defs>
        <linearGradient id="brand-logo-shine-gradient" x1="0" y1="0" x2="1" y2="0.32">
          <stop offset="0" stopColor="#ffe2c7" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffe2c7" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe2c7" stopOpacity="0" />
        </linearGradient>
        <clipPath id="brand-logo-text-clip">
          <path d={LOGO_PATHS.textWhite} />
          <path d={LOGO_PATHS.textPro} />
        </clipPath>
      </defs>

      <g fill={LOGO_COLORS.white}>
        <path d={LOGO_PATHS.ring} />
        {/* Tramo del anillo que tapa la flecha: evita un hueco cuando gira. */}
        <path d={LOGO_PATHS.patchWhite} />
      </g>
      <g fill={LOGO_COLORS.orange}>
        <path d={LOGO_PATHS.orange} />
        <path d={LOGO_PATHS.patchOrange} />
      </g>

      <g className="brand-logo-needle">
        {/* Contorno del color de la barra: separa la flecha del anillo como en el original. */}
        <path className="brand-logo-needle-cut" d={LOGO_PATHS.needle} />
        <path d={LOGO_PATHS.needle} fill={LOGO_COLORS.orange} />
      </g>

      <path d={LOGO_PATHS.textWhite} fill={LOGO_COLORS.white} />
      <path d={LOGO_PATHS.textPro} fill={LOGO_COLORS.orange} />
      <g clipPath="url(#brand-logo-text-clip)" aria-hidden="true">
        <rect className="brand-logo-shine" x="-140" y="700" width="300" height="238" fill="url(#brand-logo-shine-gradient)" />
      </g>
    </svg>
  );
}
