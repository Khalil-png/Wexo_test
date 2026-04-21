
export const captureFrame = (videoFile: File, timestamp: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timestamp, video.duration);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture frame'));
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.8);
      } else {
        reject(new Error('Failed to get canvas context'));
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = (e) => {
      reject(e);
      URL.revokeObjectURL(video.src);
    };
  });
};
