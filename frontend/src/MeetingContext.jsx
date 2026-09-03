import React, { createContext, useState } from 'react';

export const MeetingContext = createContext();

export function MeetingProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(false);

  const clearSession = () => {
    setActiveSession(null);
    setIsMinimized(false);
  };

  return (
    <MeetingContext.Provider
      value={{
        activeSession,
        setActiveSession,
        isMinimized,
        setIsMinimized,
        micActive,
        setMicActive,
        camActive,
        setCamActive,
        clearSession
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}