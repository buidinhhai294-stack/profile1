(function (app) {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const spacer = '\u2003';
  function setOrbitLabel(svg, label, repeats) {
    const textPath = svg.querySelector('textPath');
    textPath.textContent = `${label} ${spacer} `.repeat(repeats);
    let icons = svg.querySelector('.orbit-separators');
    if (!icons) {
      icons = document.createElementNS(svgNamespace, 'g');
      icons.setAttribute('class', 'orbit-separators');
      svg.append(icons);
    }
    requestAnimationFrame(() => refreshOrbitLabel(svg));
    document.fonts.ready.then(() => refreshOrbitLabel(svg));
  }
  function refreshOrbitLabel(svg) {
    if (!svg.isConnected || getComputedStyle(svg).display === 'none') return;
    const textPath = svg.querySelector('textPath');
    const icons = svg.querySelector('.orbit-separators');
    if (!icons) return;
    icons.replaceChildren();
    const fontSize = Number.parseFloat(getComputedStyle(svg).fontSize);
    const size = fontSize * 0.68;
    [...textPath.textContent].forEach((character, index) => {
      if (character !== spacer) return;
      const start = textPath.getStartPositionOfChar(index);
      const end = textPath.getEndPositionOfChar(index);
      const angle = textPath.getRotationOfChar(index);
      const icon = document.createElementNS(svgNamespace, 'image');
      icon.setAttribute('href', 'assets/icons/star.svg');
      icon.setAttribute('x', String(-size / 2));
      icon.setAttribute('y', String(-size / 2));
      icon.setAttribute('width', String(size));
      icon.setAttribute('height', String(size));
      icon.setAttribute(
        'transform',
        `translate(${(start.x + end.x) / 2} ${(start.y + end.y) / 2}) rotate(${angle}) translate(0 ${-fontSize * 0.36})`
      );
      icons.append(icon);
    });
  }

  Object.assign(app, { setOrbitLabel, refreshOrbitLabel });
})((window.Portfolio ||= {}));
