
import React from 'react';

const YouTubeTab: React.FC = () => {
  return (
    <div className="w-full h-full bg-black overflow-hidden flex flex-col pt-safe px-safe">
      <div className="flex-1 w-full relative">
        <iframe
          src="https://www.youtube.com"
          className="absolute inset-0 w-full h-full border-0"
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default YouTubeTab;
