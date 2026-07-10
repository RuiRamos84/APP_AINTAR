import { Player } from '@lordicon/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Wrapper para ícones Lordicon (v1.x).
 * Carrega o JSON via CDN ou aceita um objeto importado localmente.
 * Anima ao hover. Mostra `fallback` se o ícone não carregar.
 *
 * @param {string}        src      - URL CDN (ex: https://cdn.lordicon.com/xxx.json)
 * @param {object}        icon     - Alternativa: JSON importado diretamente
 * @param {number}        size     - Tamanho em px (default 24)
 * @param {object|string} colors   - { primary, secondary } ou "primary:#hex,secondary:#hex"
 * @param {ReactNode}     fallback - Elemento a mostrar se o ícone falhar
 */
export const LordiconIcon = ({ src, icon, size = 24, colors, fallback = null }) => {
  const playerRef = useRef(null);
  const [iconData, setIconData] = useState(icon || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (icon) { setIconData(icon); return; }
    if (!src) return;

    fetch(src)
      .then((res) => { if (!res.ok) throw new Error('fetch failed'); return res.json(); })
      .then(setIconData)
      .catch(() => setError(true));
  }, [src, icon]);

  if (error) return fallback;
  if (!iconData) return null;

  const colorsStr = colors && typeof colors === 'object'
    ? Object.entries(colors).map(([k, v]) => `${k}:${v}`).join(',')
    : (colors ?? undefined);

  return (
    <div
      style={{ width: size, height: size, flexShrink: 0, display: 'flex' }}
      onMouseEnter={() => playerRef.current?.playFromBeginning()}
    >
      <Player
        ref={playerRef}
        icon={iconData}
        size={size}
        colors={colorsStr}
      />
    </div>
  );
};

export default LordiconIcon;
