(function (app) {
  function createLiquidEffect({ portrait, core, satellites, state }) {
    const liquidCore = portrait.querySelector('.liquid-core');
    const liquidDrops = satellites.map(() => {
      const drop = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      drop.setAttribute('rx', '0');
      drop.setAttribute('ry', '0');
      portrait.querySelector('.liquid-drops').append(drop);
      return drop;
    });
    const liquidBridges = satellites.map(() => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      portrait.querySelector('.liquid-bridges').append(path);
      return path;
    });
    // Tangent curves form a narrowing neck; its width reaches zero before release.
    function liquidBridge(coreRadius, drop) {
      const radius = Math.min(drop.radiusX, drop.radiusY);
      const distance = Math.hypot(drop.x, drop.y);
      const gap = distance - coreRadius - radius;
      if (radius < 1 || distance <= Math.abs(coreRadius - radius) || gap >= 11) return '';
      const clamp = (value) => Math.max(-1, Math.min(1, value));
      const overlap = distance < coreRadius + radius;
      const u1 = overlap
        ? Math.acos(
            clamp((coreRadius ** 2 + distance ** 2 - radius ** 2) / (2 * coreRadius * distance))
          )
        : 0;
      const u2 = overlap
        ? Math.acos(
            clamp((radius ** 2 + distance ** 2 - coreRadius ** 2) / (2 * radius * distance))
          )
        : 0;
      const separation = Math.max(0, gap / 11);
      const tension = 0.52 * (1 - separation * separation * (3 - 2 * separation));
      const angle = Math.atan2(drop.y, drop.x);
      const spread = Math.acos(clamp((coreRadius - radius) / distance));
      const a1 = angle + u1 + (spread - u1) * tension;
      const b1 = angle - u1 - (spread - u1) * tension;
      const a2 = angle + Math.PI - u2 - (Math.PI - u2 - spread) * tension;
      const b2 = angle - Math.PI + u2 + (Math.PI - u2 - spread) * tension;
      const point = (x, y, r, a) => [x + Math.cos(a) * r, y + Math.sin(a) * r];
      const p1 = point(0, 0, coreRadius, a1);
      const p2 = point(drop.x, drop.y, radius, a2);
      const p3 = point(drop.x, drop.y, radius, b2);
      const p4 = point(0, 0, coreRadius, b1);
      const handles =
        Math.min(tension * 2.4, Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) / (coreRadius + radius)) *
        Math.min(1, (distance * 2) / (coreRadius + radius));
      const c1 = point(...p1, coreRadius * handles, a1 - Math.PI / 2);
      const c2 = point(...p2, radius * handles, a2 + Math.PI / 2);
      const c3 = point(...p3, radius * handles, b2 - Math.PI / 2);
      const c4 = point(...p4, coreRadius * handles, b1 + Math.PI / 2);
      return `M ${p1} C ${c1} ${c2} ${p2} L ${p3} C ${c3} ${c4} ${p4} Z`;
    }

    function drawLiquid() {
      if (!portrait.classList.contains('is-opening') && !portrait.classList.contains('is-merging'))
        return;
      const bounds = portrait.getBoundingClientRect();
      const unit = 100 / bounds.width;
      const radiusUnit = 100 / portrait.offsetWidth;
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const coreRadius = (core.getBoundingClientRect().width * unit) / 2;
      const drops = satellites.map((satellite) => {
        const rect = satellite.getBoundingClientRect();
        const matrix = new DOMMatrixReadOnly(getComputedStyle(satellite).transform);
        return {
          x: (rect.x + rect.width / 2 - centerX) * unit,
          y: (rect.y + rect.height / 2 - centerY) * unit,
          radiusX: (satellite.offsetWidth * Math.hypot(matrix.a, matrix.b) * radiusUnit) / 2,
          radiusY: (satellite.offsetHeight * Math.hypot(matrix.c, matrix.d) * radiusUnit) / 2,
        };
      });
      liquidCore.setAttribute('r', coreRadius.toFixed(3));
      drops.forEach((drop, index) => {
        // Reveal only the exposed lobe, avoiding tiny spikes while it is hidden by the avatar.
        const protrusion =
          Math.hypot(drop.x, drop.y) + Math.max(drop.radiusX, drop.radiusY) - coreRadius;
        const smooth = (value) => {
          const t = Math.max(0, Math.min(1, value));
          return t * t * (3 - 2 * t);
        };
        const reveal =
          smooth((protrusion - 6) / 10) * smooth((Math.min(drop.radiusX, drop.radiusY) - 5) / 6);
        liquidDrops[index].setAttribute('cx', drop.x.toFixed(3));
        liquidDrops[index].setAttribute('cy', drop.y.toFixed(3));
        liquidDrops[index].setAttribute('rx', drop.radiusX.toFixed(3));
        liquidDrops[index].setAttribute('ry', drop.radiusY.toFixed(3));
        const rotation = (Math.atan2(drop.y, drop.x) * 180) / Math.PI;
        liquidDrops[index].setAttribute('transform', `rotate(${rotation} ${drop.x} ${drop.y})`);
        liquidDrops[index].setAttribute('opacity', reveal.toFixed(3));
        liquidBridges[index].setAttribute('d', liquidBridge(coreRadius, drop));
        liquidBridges[index].setAttribute('opacity', reveal.toFixed(3));
      });
      state.liquidFrame = requestAnimationFrame(drawLiquid);
    }
    return drawLiquid;
  }

  Object.assign(app, { createLiquidEffect });
})((window.Portfolio ||= {}));
