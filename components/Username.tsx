
import React from 'react';
import { Check, Shield } from 'lucide-react';

interface UsernameProps {
  username: string;
  displayName?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  email?: string;
  className?: string;
  badgeSize?: number;
}

const Username: React.FC<UsernameProps> = ({ 
  username, 
  displayName,
  isVerified, 
  isAdmin,
  email,
  className = "font-bold text-white",
  badgeSize = 14
}) => {
  const isMainAdmin = email === 'ky.chaine@gmail.com';
  const showAdminBadge = isAdmin || isMainAdmin;
  const nameToDisplay = displayName || username;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="truncate cursor-text select-text">{nameToDisplay}</span>
      {showAdminBadge && (
        <div 
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: badgeSize, height: badgeSize }}
          title="Administrateur"
        >
          <Shield size={badgeSize * 0.9} className="text-white" strokeWidth={2.5} />
        </div>
      )}
      {isVerified && (
        <div 
          className="bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: badgeSize, height: badgeSize }}
          title="Vérifié"
        >
          <Check size={badgeSize * 0.7} className="text-white" strokeWidth={4} />
        </div>
      )}
    </div>
  );
};

export default Username;
