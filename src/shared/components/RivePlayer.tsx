import { useEffect } from 'react';
import { useRive } from '@rive-app/react-webgl2';

interface RivePlayerProps {
  src: string;
  stateMachine?: string;
  size: number;
  onError: () => void;
}

/**
 * Lecteur Rive concret — code-splitté (importé seulement quand un .riv existe).
 * Remonte l'échec au parent pour bascule sur le fallback statique.
 */
export default function RivePlayer({
  src,
  stateMachine,
  size,
  onError,
}: RivePlayerProps) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
  });

  useEffect(() => {
    if (!rive) return;
    rive.on('loaderror' as never, onError);
    return () => {
      rive.cleanup?.();
    };
  }, [rive, onError]);

  return <RiveComponent style={{ width: size, height: size }} />;
}
