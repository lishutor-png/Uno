import React from 'react';
import { MabarUnoLogo } from './MabarUnoLogo';

interface UnoArenaLogoProps {
  variant?: 'horizontal' | 'icon';
  className?: string;
}

export const UnoArenaLogo: React.FC<UnoArenaLogoProps> = (props) => {
  return <MabarUnoLogo {...props} />;
};
