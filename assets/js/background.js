(function (app) {
  function createBackground(phrases) {
    const backgroundWords = document.querySelector('.background-words');

    // Different apparent distances: many tiny distant words, fewer large close ones.
    const depthLayers = [
      { name: 'far', minSize: 6, range: 4, opacity: 0.11, duration: 190, jitter: 52, blur: 0.45 },
      {
        name: 'middle',
        minSize: 11,
        range: 6,
        opacity: 0.16,
        duration: 145,
        jitter: 40,
        blur: 0.15,
      },
      { name: 'near', minSize: 20, range: 10, opacity: 0.22, duration: 100, jitter: 32, blur: 0 },
      {
        name: 'foreground',
        minSize: 37,
        range: 19,
        opacity: 0.11,
        duration: 82,
        jitter: 30,
        blur: 0.9,
      },
    ];
    const depthDistribution = [0, 1, 0, 2, 0, 1, 0, 3];
    const wordCount = Math.max(64, Math.min(112, Math.round((innerWidth * innerHeight) / 11000)));
    const wordFragment = document.createDocumentFragment();
    for (let index = 0; index < wordCount; index++) {
      const layerIndex = depthDistribution[index % depthDistribution.length];
      const layer = depthLayers[layerIndex];
      const word = document.createElement('span');
      word.className = 'background-word';
      word.dataset.depth = layer.name;
      word.textContent = phrases[(index * 7 + Math.floor(index / 8)) % phrases.length];
      const fontSize = layer.minSize + ((index * 7) % layer.range);
      const duration = layer.duration + ((index * 11) % layer.jitter);
      word.style.cssText = `--top: ${((index * 0.41421356237) % 1) * 104 - 2}%;
      --font-size: clamp(${(fontSize * 0.68).toFixed(2)}px, ${(fontSize / 12.8).toFixed(3)}vw, ${fontSize}px);
      --opacity: ${layer.opacity + (index % 3) * 0.012}; --word-blur: ${layer.blur}px;
      --word-layer: ${layerIndex}; --duration: ${duration}s;
      --delay: -${((index * 0.73205080757) % 1) * duration}s;
      --direction: ${index % 2 ? 'reverse' : 'normal'};
      --rest-x: ${(index * 23 + 9) % 72}vw;`;
      wordFragment.append(word);
    }
    backgroundWords.append(wordFragment);
    for (let index = 0; index < 24; index++) {
      const bit = document.createElement('span');
      bit.className = 'background-bit';
      bit.textContent = index % 3 ? '1' : '0';
      bit.style.cssText = `--left: ${(index * 37 + 11) % 100}%;
      --duration: ${42 + ((index * 5) % 27)}s; --delay: -${index * 13 + 5}s;`;
      backgroundWords.append(bit);
    }
    return {
      setPaused(paused) {
        backgroundWords.classList.toggle('is-paused', paused);
      },
    };
  }

  Object.assign(app, { createBackground });
})((window.Portfolio ||= {}));
