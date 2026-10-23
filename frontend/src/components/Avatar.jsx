import { useState } from 'react';
import { fotoUrl } from '../utils/foto';

/**
 * Foto de perfil, o las iniciales si la persona no subió una (o si la imagen no carga).
 * `className` es la clase del círculo/cuadrado de cada pantalla, así conserva su tamaño y color.
 */
export default function Avatar({ idUsuario, fotoVersion, nombre = '', apellido = '', className = '' }) {
  // Se recuerda qué versión falló: si la persona sube otra foto, se vuelve a intentar
  const [versionFallida, setVersionFallida] = useState(null);
  const conFoto = Boolean(idUsuario && fotoVersion) && versionFallida !== fotoVersion;
  const iniciales = `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase() || '?';

  return (
    <div className={`${className}${conFoto ? ' has-photo' : ''}`}>
      {conFoto
        ? <img className="avatar-img" src={fotoUrl(idUsuario, fotoVersion)} alt="" onError={() => setVersionFallida(fotoVersion)} />
        : iniciales}
    </div>
  );
}
