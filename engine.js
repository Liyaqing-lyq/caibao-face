export class CharacterCycle {
  constructor(count, random = Math.random) {
    if (count < 2) throw new Error('至少需要两款形象');
    this.count = count;
    this.random = random;
    this.bag = [];
    this.last = -1;
  }

  next() {
    if (!this.bag.length) {
      this.bag = Array.from({ length: this.count }, (_, i) => i);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.at(-1) === this.last) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag.at(-1), this.bag[0]];
      }
    }
    this.last = this.bag.pop();
    return this.last;
  }
}

export class GestureGate {
  constructor(hold = 700, release = 600) {
    this.hold = hold;
    this.release = release;
    this.reset();
  }

  reset() {
    this.since = null;
    this.released = null;
    this.latched = false;
    this.progress = 0;
  }

  update(inside, now) {
    if (!inside) {
      this.since = null;
      this.progress = 0;
      if (this.released === null) this.released = now;
      if (now - this.released >= this.release) this.latched = false;
      return false;
    }
    this.released = null;
    if (this.latched) {
      this.progress = 1;
      return false;
    }
    if (this.since === null) this.since = now;
    this.progress = Math.min(1, (now - this.since) / this.hold);
    if (this.progress >= 1) {
      this.latched = true;
      return true;
    }
    return false;
  }
}

export function faceGeometry(points, width, height, mirror = false) {
  const p = i => ({ x: (mirror ? 1 - points[i].x : points[i].x) * width, y: points[i].y * height });
  let a = p(33), b = p(263);
  if (a.x > b.x) [a, b] = [b, a];
  const top = p(10), bottom = p(152), left = p(234), right = p(454);
  const eyeWidth = Math.hypot(b.x - a.x, b.y - a.y);
  const faceHeight = Math.hypot(top.x - bottom.x, top.y - bottom.y);
  return {
    x: (a.x + b.x) / 2,
    y: (top.y + bottom.y) / 2,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    width: Math.min(Math.max(Math.hypot(left.x - right.x, left.y - right.y) * 1.5, eyeWidth * 2.8), faceHeight * 1.15),
    height: faceHeight,
    center: { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 },
  };
}

export function frameFromHands(hands, width, height, mirror = false) {
  if (hands.length !== 2) return null;
  const p = q => ({ x: (mirror ? 1 - q.x : q.x) * width, y: q.y * height });
  const tips = [];
  for (const hand of hands) {
    const tip = p(hand[8]), joint = p(hand[6]), wrist = p(hand[0]), thumb = p(hand[4]);
    if (Math.hypot(tip.x - wrist.x, tip.y - wrist.y) < Math.hypot(joint.x - wrist.x, joint.y - wrist.y) * 1.1) return null;
    if (Math.hypot(tip.x - thumb.x, tip.y - thumb.y) < width * .045) return null;
    tips.push(tip, thumb);
  }
  const xs = tips.map(point => point.x), ys = tips.map(point => point.y);
  const rect = {
    x: Math.min(...xs), y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), tips,
  };
  return rect.w > width * .14 && rect.h > height * .14 ? rect : null;
}

export function faceInside(frame, face) {
  if (!frame || !face) return false;
  return face.center.x > frame.x && face.center.x < frame.x + frame.w
    && face.center.y > frame.y && face.center.y < frame.y + frame.h
    && frame.w > face.width * .55 && frame.h > face.height * .55;
}
