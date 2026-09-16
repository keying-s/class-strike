import * as THREE from 'three';

export const WEAPONS = {
  ak: { label: 'AK-47', dmg: 33, hs: 4, itv: 0.100, mag: 30, res: 90, rel: 2.3,
        spr: 0.008, bloom: 0.013, bmax: 0.055, bdec: 0.09, kick: 0.017,
        auto: true, sndf: 850, sndgain: 1.0 },
  usp: { label: 'USP-S', dmg: 26, hs: 4, itv: 0.170, mag: 12, res: 48, rel: 1.9,
        spr: 0.005, bloom: 0.010, bmax: 0.045, bdec: 0.11, kick: 0.011,
        auto: false, sndf: 1300, sndgain: 0.65 },
};

const matBody = new THREE.MeshLambertMaterial({ color: 0x2a2d31 });
const matWood = new THREE.MeshLambertMaterial({ color: 0x6e4a26 });
const matMetal = new THREE.MeshLambertMaterial({ color: 0x17191c });

function part(g, mat, w, h, d, x, y, z, rx = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m;
}

function makeAK() {
  const g = new THREE.Group();
  part(g, matBody, 0.07, 0.09, 0.5, 0, 0, -0.1);        // 机匣
  part(g, matMetal, 0.03, 0.03, 0.34, 0, 0.01, -0.5);   // 枪管
  part(g, matWood, 0.06, 0.07, 0.22, 0, -0.01, -0.42);  // 护木
  part(g, matWood, 0.05, 0.08, 0.2, 0, -0.02, 0.22, 0.18); // 枪托
  part(g, matMetal, 0.05, 0.16, 0.07, 0, -0.11, -0.12, 0.5); // 弹匣（弧形近似）
  part(g, matWood, 0.04, 0.09, 0.05, 0, -0.1, 0.05, 0.3);   // 握把
  return { group: g, muzzle: new THREE.Vector3(0, 0.01, -0.68) };
}

function makeUSP() {
  const g = new THREE.Group();
  part(g, matBody, 0.05, 0.08, 0.26, 0, 0, -0.05);      // 套筒
  part(g, matMetal, 0.03, 0.03, 0.1, 0, 0.005, -0.2);   // 消音管
  part(g, matMetal, 0.045, 0.13, 0.06, 0, -0.09, 0.04, 0.25); // 握把
  return { group: g, muzzle: new THREE.Vector3(0, 0.005, -0.27) };
}

function flashTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,240,180,1)');
  gr.addColorStop(0.4, 'rgba(255,180,60,.85)');
  gr.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export class ViewModel {
  constructor(camera) {
    this.root = new THREE.Group();
    this.base = new THREE.Vector3(0.26, -0.24, -0.5);
    this.root.position.copy(this.base);
    camera.add(this.root);

    this.models = { ak: makeAK(), usp: makeUSP() };
    for (const k in this.models) { this.models[k].group.visible = false; this.root.add(this.models[k].group); }

    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.flash.visible = false;
    this.root.add(this.flash);

    this.cur = 'ak'; this.show('ak');
    this.bobT = 0; this.kick = 0; this.flashT = 0; this.reloadT = 0;
    this._muzzleWorld = new THREE.Vector3();
  }

  show(w) {
    this.cur = w;
    for (const k in this.models) this.models[k].group.visible = (k === w);
    const m = this.models[w].muzzle;
    this.flash.position.copy(m);
  }

  fire() { this.kick = 1; this.flashT = 0.045; this.flash.rotation.z = Math.random() * 6.28; }

  update(dt, { moving = false, grounded = true, reloadT = 0 }) {
    this.bobT += dt * (moving && grounded ? 9 : 2);
    this.kick = Math.max(0, this.kick - dt * 9);
    this.flashT -= dt; this.flash.visible = this.flashT > 0;
    this.reloadT = reloadT;
    const bob = moving && grounded ? 1 : 0;
    const model = this.models[this.cur].group;
    model.position.z = this.kick * 0.09;
    model.rotation.x = this.kick * 0.14 + (reloadT > 0 ? 0.65 : 0);
    model.rotation.z = (reloadT > 0 ? 0.25 : 0);
    this.root.position.set(
      this.base.x + Math.sin(this.bobT) * 0.008 * bob,
      this.base.y + Math.abs(Math.cos(this.bobT)) * 0.01 * bob + this.kick * 0.012,
      this.base.z
    );
  }

  muzzleWorld(camera) {
    const m = this.models[this.cur].muzzle;
    this._muzzleWorld.copy(m).applyMatrix4(this.root.matrixWorld);
    return this._muzzleWorld;
  }
}
