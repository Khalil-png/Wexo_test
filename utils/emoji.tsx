
import React from 'react';

export const EMOJI_MAP: Record<string, string> = {
  '😀': 'https://emoji.aranja.com/emojis/google/1f600.png',
  '😃': 'https://emoji.aranja.com/emojis/google/1f603.png',
  '😄': 'https://emoji.aranja.com/emojis/google/1f604.png',
  '😁': 'https://emoji.aranja.com/emojis/google/1f601.png',
  '😆': 'https://emoji.aranja.com/emojis/google/1f606.png',
  '😅': 'https://emoji.aranja.com/emojis/google/1f605.png',
  '🤣': 'https://emoji.aranja.com/emojis/google/1f923.png',
  '😂': 'https://emoji.aranja.com/emojis/google/1f602.png',
  '🥲': 'https://emoji.aranja.com/emojis/google/1f972.png',
  '🥹': 'https://emoji.aranja.com/emojis/google/1f979.png',
  '☺️': 'https://emoji.aranja.com/emojis/google/263a-fe0f.png',
  '😊': 'https://emoji.aranja.com/emojis/google/1f60a.png',
  '😇': 'https://emoji.aranja.com/emojis/google/1f607.png',
  '🙂': 'https://emoji.aranja.com/emojis/google/1f642.png',
  '🙃': 'https://emoji.aranja.com/emojis/google/1f643.png',
  '😉': 'https://emoji.aranja.com/emojis/google/1f609.png',
  '😌': 'https://emoji.aranja.com/emojis/google/1f60c.png',
  '😍': 'https://emoji.aranja.com/emojis/google/1f60d.png',
  '🥰': 'https://emoji.aranja.com/emojis/google/1f970.png',
};

export const renderTextWithEmojis = (text: string, sizeClass: string = 'w-5 h-5') => {
  if (!text) return null;

  // Create a regex from the emoji map keys
  const emojiRegex = new RegExp(`(${Object.keys(EMOJI_MAP).join('|')})`, 'g');
  
  const parts = text.split(emojiRegex);

  return parts.map((part, index) => {
    if (EMOJI_MAP[part]) {
      return (
        <img
          key={index}
          src={EMOJI_MAP[part]}
          alt={part}
          className={`inline-block ${sizeClass} aspect-square object-cover mx-0.5 align-text-bottom`}
          referrerPolicy="no-referrer"
        />
      );
    }
    return part;
  });
};
