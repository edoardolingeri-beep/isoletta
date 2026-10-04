// Il gioco: collega stato, mondo 3D, input e interfaccia.
import * as THREE from 'three';
import { BALANCE } from '../config/balance';
import { BUILDINGS, type BuildingId } from '../config/buildings';
import { RESOURCES, RESOURCE_IDS, type Bundle, type ResourceId } from '../config/resources';
import { ZONES, type Disc, type ZoneDef, type ZoneId } from '../config/zones';
import { Particles } from '../fx/particles';
import { animate, ease, popIn, popOut, squash, updateTweens, wobble } from '../fx/tween';
import { CameraRig } from '../scene/controls';
import { Fireflies, Rain } from '../scene/entities/ambient';
import { Boat } from '../scene/entities/boats';
import { BuildingView } from '../scene/entities/buildingView';
import { Gatherable } from '../scene/entities/gatherables';
import { Villager } from '../scene/entities/villagers';
import { buildFog, buildLand, groundHeight, LAND_TOP, onSand, updateFog } from '../scene/island';
import { createModel } from '../scene/models/registry';
import { Stage } from '../scene/stage';
import { feedbackSettings, sfx, unlockAudio, vibrate } from '../ui/feedback';
import { chips, fmt, Hud } from '../ui/hud';
import { ICONS, resIcon } from '../ui/icons';
import { buildingSheet, settingsModal, welcomeModal, zoneSheet } from '../ui/panels';
import { beauty, buildingRate, canAfford, computeOffline, give, inhabitants, laborRate, levelOf, pay, totalRate } from './economy';
import { advanceQuest, currentQuest } from './quests';
import { loadGame, saveGame, wipeSave, type GameState } from './state';

type TapHandler = (hit: THREE.Vector3) => void;

interface ZoneRuntime {
  def: ZoneDef;
  content: THREE.Group;
  fog?: THREE.Group;
  tag?: HTMLElement;
  shells: Gatherable[];
}

export class Game {
  state: GameState;
  readonly stage: Stage;
  readonly rig: CameraRig;
  readonly hud: Hud;
  private particles: Particles;
  private zones = new Map<ZoneId, ZoneRuntime>();
  private gatherables: Gatherable[] = [];
  private buildings = new Map<BuildingId, BuildingView>();
  private buildingMarkers = new Map<BuildingId, HTMLElement>();
  private villagers: Villager[] = [];
  private boats: Boat[] = [];
  private boatMarkers = new Map<Boat, HTMLElement>();
  private campfires: THREE.Object3D[] = [];
  private fireflies: Fireflies;
  private rain: Rain;
  private interact = new Map<THREE.Object3D, TapHandler>();
  private obstacles: THREE.Vector3[] = [];
  private raycaster = new THREE.Raycaster();
  private time = 0;
  private raining = false;
  private rainLeft = 0;
  private weatherTimer = 0;
  private boatTimer = 8;
  private saveTimer = 0;
  private slowTimer = 0;
  private laborBuffer = 0;
  private laborTimer = 2;
  private combo = 0;
  private lastGather = 0;
  private lastToast = 0;
  private openSheet: { kind: 'building'; id: BuildingId } | { kind: 'zone'; id: ZoneId } | null = null;
  private pointer: HTMLElement | null = null;
  private lastQuestIndex = -1;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.state = loadGame();
    feedbackSettings.sound = this.state.settings.sound;
    feedbackSettings.vibration = this.state.settings.vibration;

    this.stage = new Stage(canvas);
    this.rig = new CameraRig(this.stage.camera, canvas);
    this.rig.onTap = (x, y) => this.onTap(x, y);
    this.hud = new Hud(uiRoot);
    this.hud.onQuestTap = () => this.onQuestTap();
    this.hud.onSettings = () => this.openSettings();
    this.hud.onSheetClose = () => (this.openSheet = null);
    this.particles = new Particles(this.stage.scene);
    this.fireflies = new Fireflies(this.stage.scene);
    this.rain = new Rain(this.stage.scene);

    canvas.addEventListener('pointerdown', unlockAudio, { once: false });
    uiRoot.addEventListener('pointerdown', unlockAudio);

    this.buildWorld();
    this.hud.snapResources(this.state.res);
    this.refreshSlowUI(true);

    const save = () => saveGame(this.state);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
      else this.checkOffline();
    });
    addEventListener('pagehide', save);
    addEventListener('resize', () => this.stage.resize());
  }

  // =========================================================== costruzione del mondo

  private unlockedDiscs(): Disc[] {
    return this.state.zones.flatMap((z) => ZONES.find((d) => d.id === z)!.discs);
  }

  private buildWorld(): void {
    for (const def of ZONES) {
      const content = new THREE.Group();
      this.stage.scene.add(content);
      const rt: ZoneRuntime = { def, content, shells: [] };
      this.zones.set(def.id, rt);
      if (this.state.zones.includes(def.id)) this.populateZone(rt, false);
      else this.addFog(rt);
    }
    this.stage.setLand(this.unlockedDiscs());
    this.placeFireflies();
    this.syncVillagers(false);
    // con più zone sbloccate la camera inquadra il centro dell'isola
    if (this.state.zones.includes('forest')) this.rig.target.set(0, 0, -3.5);
  }

  private addFog(rt: ZoneRuntime): void {
    const fog = buildFog(rt.def);
    rt.fog = fog;
    this.stage.scene.add(fog);
    const [lx, lz] = rt.def.label;
    const pos = new THREE.Vector3(lx, 1.4, lz);
    const html = rt.def.comingSoon
      ? `<div class="price-tag soon tap"><div class="pt-title">${ICONS.lock}Presto: ${rt.def.name}</div></div>`
      : `<div class="price-tag tap"><div class="pt-title">${ICONS.lock}${rt.def.name}</div>${chips(rt.def.cost ?? {})}<div class="dot" style="display:none">!</div></div>`;
    rt.tag = this.hud.addAnchor(html, () => pos, () => this.openZone(rt.def.id));
    this.interact.set(fog, () => this.openZone(rt.def.id));
  }

  /** Crea terreno, oggetti ed edifici di una zona. */
  private populateZone(rt: ZoneRuntime, animated: boolean): void {
    const { def, content } = rt;
    content.add(buildLand(def));
    const discs = def.discs;
    const items: THREE.Object3D[] = [];

    for (const p of def.plots) {
      const y = p.building === 'dock' ? LAND_TOP : groundHeight(p.x, p.z, discs);
      const view = new BuildingView(p.building, p.x, y, p.z, p.rot);
      view.setLevel(levelOf(this.state, p.building), false);
      content.add(view.root);
      this.buildings.set(p.building, view);
      this.interact.set(view.root, () => this.openBuilding(p.building));
      this.obstacles.push(new THREE.Vector3(p.x, 0, p.z));
      items.push(view.root);
      const marker = this.hud.addAnchor('', () => (this.buildingMarkers.get(p.building)?.dataset.on ? view.topPoint() : null), () => this.openBuilding(p.building), 6);
      this.buildingMarkers.set(p.building, marker);
    }

    for (const g of def.gatherables) {
      const ga = new Gatherable(g.type, def.id);
      const y = g.type === 'fish' ? 0 : groundHeight(g.x, g.z, discs);
      ga.obj.position.set(g.x, y, g.z);
      content.add(ga.obj);
      this.gatherables.push(ga);
      this.interact.set(ga.obj, (hit) => this.gather(ga, hit));
      this.obstacles.push(new THREE.Vector3(g.x, 0, g.z));
      items.push(ga.obj);
    }

    let seed = def.id.length * 31;
    for (const d of def.decor) {
      const o = createModel(d.model, seed++);
      o.position.set(d.x, groundHeight(d.x, d.z, discs), d.z);
      if (d.rot !== undefined) o.rotation.y = d.rot;
      if (d.scale) o.scale.setScalar(d.scale);
      o.userData.baseScale = o.scale.x;
      content.add(o);
      if (o.userData.flame) this.campfires.push(o);
      this.obstacles.push(new THREE.Vector3(d.x, 0, d.z));
      items.push(o);
    }

    for (let i = 0; i < def.shells; i++) {
      const s = new Gatherable('shell', def.id);
      content.add(s.obj);
      rt.shells.push(s);
      this.gatherables.push(s);
      this.placeShell(s, rt);
      this.interact.set(s.obj, (hit) => this.gather(s, hit));
      items.push(s.obj);
    }

    if (animated) {
      content.position.y = -2.2;
      animate(1.3, (k) => (content.position.y = -2.2 * (1 - k)), { ease: ease.outBack });
      items.forEach((o, i) => popIn(o, 0.6, 0.9 + i * 0.06));
    }
  }

  private placeShell(s: Gatherable, rt: ZoneRuntime): void {
    const discs = rt.def.discs;
    for (let tries = 0; tries < 40; tries++) {
      const d = discs[Math.floor(Math.random() * discs.length)];
      const a = Math.random() * Math.PI * 2, rr = d.r * (0.55 + Math.random() * 0.4);
      const x = d.x + Math.cos(a) * rr, z = d.z + Math.sin(a) * rr;
      if (!onSand(x, z, this.unlockedDiscs())) continue;
      if (this.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 1.2)) continue;
      if (rt.shells.some((o) => o !== s && o.obj.visible && o.obj.position.distanceTo(new THREE.Vector3(x, LAND_TOP, z)) < 1.5)) continue;
      s.obj.position.set(x, LAND_TOP, z);
      s.obj.visible = true;
      s.charges = 1;
      return;
    }
    s.obj.visible = false;
    s.respawnIn = 3;
  }

  private placeFireflies(): void {
    const spots = this.unlockedDiscs().filter((d) => d.grass > 0.3).map((d) => ({ x: d.x, z: d.z, r: d.r * d.grass }));
    if (spots.length) this.fireflies.place(spots);
  }

  private syncVillagers(animated: boolean): void {
    const want = Math.min(inhabitants(this.state), BALANCE.maxVisibleVillagers);
    const discs = this.unlockedDiscs();
    while (this.villagers.length < want) {
      const i = this.villagers.length;
      // i nuovi arrivati escono dalla capanna (o compaiono vicino al fuoco)
      const hut = this.buildings.get('hut');
      const spread = [[0.9, 1.9], [-1.0, 0.6], [2.4, 0.4], [-2.4, -0.2], [1.6, 3.2], [-0.4, -1.8], [3.0, -0.4], [-1.6, 2.6]];
      const [sx, sz] = spread[i % spread.length];
      const start = animated && hut && hut.level > 0 ? hut.root.position.clone().add(new THREE.Vector3(0.4, 0, 1.3)) : new THREE.Vector3(sx, 0, sz);
      start.y = groundHeight(start.x, start.z, discs);
      const v = new Villager(i * 17 + 5, start);
      this.stage.scene.add(v.obj);
      this.villagers.push(v);
      this.interact.set(v.obj, () => this.tapVillager(v));
      if (animated) {
        v.appear();
        v.jump();
        this.particles.burst(start.clone().setY(start.y + 0.5), ['#ffd23f', '#ff86c0', '#ffffff'], 10, { speed: 2, up: 3, size: 0.7 });
      }
    }
  }

  // =========================================================== input

  private onTap(x: number, y: number): void {
    const ndc = new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const roots = [...this.interact.keys()].filter((o) => o.visible);
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !this.interact.has(o)) o = o.parent;
      if (o && o.visible) {
        this.interact.get(o)!(hit.point);
        return;
      }
    }
    this.hud.closeSheet();
  }

  private toastThrottled(text: string, icon?: string): void {
    if (this.time - this.lastToast < 1.4) return;
    this.lastToast = this.time;
    this.hud.toast(text, icon);
  }

  private screenOf(p: THREE.Vector3) {
    return this.hud.worldToScreen(p, this.stage.camera);
  }

  // =========================================================== raccolta

  private gather(g: Gatherable, hit: THREE.Vector3): void {
    if (!g.obj.visible) return;
    const r = g.def.resource;
    const amount = g.harvest();
    if (amount <= 0) {
      wobble(g.obj, 0.06, 0.3);
      sfx('click');
      this.toastThrottled(g.type === 'fish' ? 'I pesci sono scappati… torna tra poco!' : 'Sta ricrescendo… riprova tra poco!');
      return;
    }
    // combo: tocchi rapidi alzano il tono del suono
    this.combo = this.time - this.lastGather < 0.7 ? this.combo + 1 : 0;
    this.lastGather = this.time;
    const pitch = 1 + Math.min(this.combo, 12) * 0.06;

    this.state.res[r] += amount;
    this.state.stats.gathered[r] += amount;

    const top = g.obj.position.clone().add(new THREE.Vector3(0, g.type === 'palm' ? 2.6 : g.type === 'tree' ? 2.8 : 0.9, 0));
    this.hud.floatGain(top, r, amount);
    this.hud.fly(r, this.screenOf(hit), amount);

    switch (g.type) {
      case 'palm':
      case 'tree':
        wobble(g.obj, 0.16, 0.6);
        squash(g.obj, 0.12, 0.5);
        this.particles.burst(hit, ['#39c75c', '#7be36a', RESOURCES.wood.color], 10, { speed: 2.5, up: 3 });
        sfx('pop', pitch);
        break;
      case 'fish':
        squash(g.obj, 0.3, 0.5);
        this.particles.burst(g.obj.position.clone().setY(0.2), ['#ffffff', '#bff3ff', '#4aa8ff'], 14, { speed: 2, up: 5, size: 0.8 });
        sfx('splash', pitch);
        break;
      case 'shell': {
        this.particles.burst(g.obj.position.clone().setY(0.6), ['#ff86c0', '#ffd23f', '#ffffff'], 12, { speed: 2, up: 4, size: 0.7 });
        sfx('pop', pitch * 1.3);
        const obj = g.obj;
        animate(0.25, (k) => (obj.position.y = LAND_TOP + Math.sin(k * Math.PI) * 0.6), { ease: ease.outQuad });
        popOut(obj, 0.3, () => {
          obj.visible = false;
          obj.scale.setScalar(obj.userData.baseScale ?? 1);
        });
        g.respawnIn = g.def.respawnSec ?? 10;
        break;
      }
    }
    vibrate(8);
    this.refreshSlowUI();
  }

  // =========================================================== edifici

  private focusOn(p: THREE.Vector3, distance?: number): void {
    // sposta un po' il punto verso la camera così l'oggetto resta sopra al pannello
    const off = new THREE.Vector3(Math.sin(this.rig.azimuth), 0, Math.cos(this.rig.azimuth)).multiplyScalar(this.hud.sheetOpen ? 3.2 : 0);
    this.rig.focus(p.clone().add(off), distance);
  }

  private openBuilding(id: BuildingId): void {
    const view = this.buildings.get(id);
    if (!view) return;
    sfx('click');
    view.bounce();
    this.openSheet = { kind: 'building', id };
    this.renderBuildingSheet(id);
    this.focusOn(view.root.position, Math.min(this.rig.distance, 24));
  }

  private renderBuildingSheet(id: BuildingId): void {
    const { html } = buildingSheet(this.state, id);
    this.hud.openSheet(html, (card) => {
      card.querySelector('[data-action]')?.addEventListener('click', (e) => this.upgrade(id, e.currentTarget as HTMLElement));
    });
  }

  private upgrade(id: BuildingId, btn: HTMLElement): void {
    const lvl = levelOf(this.state, id);
    const def = BUILDINGS[id];
    if (lvl >= def.levels.length) return;
    const cost = def.levels[lvl].cost;
    if (!pay(this.state, cost)) {
      this.denied(btn, cost);
      return;
    }
    const newLevel = lvl + 1;
    this.state.buildings[id] = newLevel;
    const view = this.buildings.get(id)!;
    view.setLevel(newLevel, true);
    const top = view.topPoint();
    const center = view.root.position.clone().setY(view.root.position.y + 0.6);
    this.particles.burst(center, ['#ff4d6d', '#ffd23f', '#4aa8ff', '#7be36a', '#ff86c0', '#b07cff'], 40, { speed: 4, up: 7, size: 1.1, life: 1.4 });
    this.particles.burst(center.clone().setY(view.root.position.y + 0.1), ['#ffe2a8', '#f2c27a'], 16, { speed: 3, up: 1.5, size: 0.9, gravity: 4 });
    this.rig.shake(0.25);
    sfx('build');
    vibrate([15, 40, 25]);
    this.hud.floatText(top, newLevel === 1 ? 'Costruito!' : `Livello ${newLevel}!`, '#ffd23f');
    this.syncVillagers(true);
    this.renderBuildingSheet(id);
    saveGame(this.state);
    this.refreshSlowUI(true);
  }

  private denied(btn: HTMLElement, cost: Bundle): void {
    sfx('error');
    vibrate(30);
    btn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 320 });
    const missing: Bundle = {};
    for (const r of RESOURCE_IDS) {
      const lack = (cost[r] ?? 0) - Math.floor(this.state.res[r]);
      if (lack > 0) missing[r] = lack;
    }
    this.hud.toast(`Ti mancano: ${chips(missing)}`);
  }

  // =========================================================== zone

  private openZone(id: ZoneId): void {
    const rt = this.zones.get(id)!;
    sfx('click');
    this.openSheet = { kind: 'zone', id };
    this.renderZoneSheet(id);
    const [x, z] = rt.def.label;
    this.focusOn(new THREE.Vector3(x, 0, z), Math.min(this.rig.distance, 28));
  }

  private renderZoneSheet(id: ZoneId): void {
    const rt = this.zones.get(id)!;
    const { html } = zoneSheet(this.state, rt.def);
    this.hud.openSheet(html, (card) => {
      card.querySelector('[data-action]')?.addEventListener('click', (e) => this.unlockZone(id, e.currentTarget as HTMLElement));
    });
  }

  private unlockZone(id: ZoneId, btn: HTMLElement): void {
    const rt = this.zones.get(id)!;
    if (!rt.def.cost || this.state.zones.includes(id)) return;
    if (!pay(this.state, rt.def.cost)) {
      this.denied(btn, rt.def.cost);
      return;
    }
    this.state.zones.push(id);
    this.hud.closeSheet();
    if (rt.tag) this.hud.removeAnchor(rt.tag);
    // la nebbia si dissolve in tanti sbuffi
    const fog = rt.fog!;
    this.interact.delete(fog);
    fog.children.forEach((puff, i) => {
      const dir = puff.position.clone().sub(new THREE.Vector3(rt.def.label[0], 0, rt.def.label[1])).setY(0).normalize();
      const from = puff.position.clone();
      const s0 = puff.scale.x;
      animate(
        1.0,
        (k) => {
          puff.position.copy(from).addScaledVector(dir, k * 4).setY(from.y + k * 2.5);
          puff.scale.setScalar(Math.max(0.001, s0 * (1 + k * 0.6) * (1 - k)));
        },
        { ease: ease.inQuad, delay: i * 0.015 },
      );
    });
    setTimeout(() => this.stage.scene.remove(fog), 1800);
    const [lx, lz] = rt.def.label;
    this.particles.burst(new THREE.Vector3(lx, 1.5, lz), ['#ffffff', '#e8f2ff', '#bff3ff'], 50, { speed: 6, up: 5, size: 1.6, gravity: 2, life: 1.6 });
    sfx('whoosh');
    setTimeout(() => sfx('build'), 700);
    vibrate([20, 60, 40]);
    this.rig.shake(0.4);
    this.focusOn(new THREE.Vector3(lx, 0, lz), 30);

    this.populateZone(rt, true);
    this.stage.setLand(this.unlockedDiscs());
    this.placeFireflies();
    this.hud.floatText(new THREE.Vector3(lx, 3, lz), `${rt.def.name}!`, '#ffd23f');
    saveGame(this.state);
    this.refreshSlowUI(true);
  }

  // =========================================================== abitanti e barche

  private tapVillager(v: Villager): void {
    v.jump();
    sfx('pop', 1.6);
    vibrate(6);
    const pos = () => v.obj.position.clone().add(new THREE.Vector3(0, 1.9, 0));
    const el = this.hud.addAnchor(`<div class="speech">${v.phrase(this.stage.sky.night > 0.5)}</div>`, pos);
    setTimeout(() => this.hud.removeAnchor(el), 1700);
    this.particles.burst(pos(), ['#ff4d6d', '#ff86c0'], 6, { speed: 1.2, up: 2.5, size: 0.6, gravity: 2 });
  }

  private spawnBoat(): void {
    const b = new Boat(Math.floor(Math.random() * 1000), new THREE.Vector3(0, 0, -3));
    this.stage.scene.add(b.obj);
    this.boats.push(b);
    this.interact.set(b.obj, () => this.tipBoat(b));
    const marker = this.hud.addAnchor(`<div class="bubble green">${resIcon('coin')}</div>`, () => b.obj.position.clone().setY(2.9), () => this.tipBoat(b), 4);
    this.boatMarkers.set(b, marker);
  }

  private tipBoat(b: Boat): void {
    if (b.tipped) {
      this.toastThrottled('Hanno già lasciato la mancia!');
      return;
    }
    b.tipped = true;
    const m = this.boatMarkers.get(b);
    if (m) {
      this.hud.removeAnchor(m);
      this.boatMarkers.delete(b);
    }
    const tip = Math.round(BALANCE.boatTipBase + beauty(this.state) * BALANCE.boatTipPerBeauty);
    this.state.res.coin += tip;
    this.state.stats.tips++;
    const p = b.obj.position.clone().setY(1.6);
    this.hud.floatGain(p.clone().setY(2.4), 'coin', tip);
    this.hud.fly('coin', this.screenOf(p), 5);
    this.particles.burst(p, ['#ff4d6d', '#ff86c0', '#ffd23f'], 16, { speed: 2.5, up: 5, size: 0.9 });
    animate(0.6, (k) => (b.hop = Math.sin(k * Math.PI) * 0.8), { ease: ease.linear });
    sfx('coin');
    setTimeout(() => sfx('coin', 1.2), 120);
    vibrate(12);
    this.hud.toast('Mancia dai turisti!', ICONS.heart);
    this.refreshSlowUI();
  }

  // =========================================================== missioni

  private questFocus(): THREE.Vector3 | null {
    const q = currentQuest(this.state);
    if (!q || q.done) return null;
    const g = q.def.goal;
    const cam = this.stage.camera.position;
    const nearest = (pred: (x: Gatherable) => boolean) => {
      const list = this.gatherables.filter((x) => x.obj.visible && pred(x));
      list.sort((a, b) => Number(b.charges > 0) - Number(a.charges > 0) || a.obj.position.distanceTo(cam) - b.obj.position.distanceTo(cam));
      return list[0]?.obj.position ?? null;
    };
    switch (g.kind) {
      case 'gather':
        return nearest((x) => x.def.resource === g.resource);
      case 'build':
        return this.buildings.get(g.building)?.root.position ?? null;
      case 'zone': {
        const [x, z] = this.zones.get(g.zone)!.def.label;
        return new THREE.Vector3(x, 0, z);
      }
      case 'tips':
        return this.boats.find((b) => !b.tipped)?.obj.position ?? null;
      default:
        return null;
    }
  }

  private onQuestTap(): void {
    const q = currentQuest(this.state);
    if (!q) return;
    if (q.done) {
      give(this.state, q.def.reward);
      const rect = this.hud.questRect();
      const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      for (const r of RESOURCE_IDS) if ((q.def.reward[r] ?? 0) > 0) this.hud.fly(r, from, 5);
      sfx('quest');
      vibrate([10, 30, 10]);
      advanceQuest(this.state);
      saveGame(this.state);
      this.refreshSlowUI(true);
      return;
    }
    sfx('click');
    const g = q.def.goal;
    if (g.kind === 'build') return this.openBuilding(g.building);
    if (g.kind === 'zone') return this.openZone(g.zone);
    const p = this.questFocus();
    if (p) this.focusOn(p);
    else if (g.kind === 'tips') this.hud.toast('Aspetta che passi una barca…');
    else if (g.kind === 'beauty') this.hud.toast('Costruisci e migliora edifici per più bellezza!', ICONS.star);
    else if (g.kind === 'inhabitants') this.hud.toast('Migliora le case per far arrivare abitanti!', ICONS.people);
  }

  // =========================================================== impostazioni e offline

  private openSettings(): void {
    sfx('click');
    let armed = false;
    this.hud.openModal(settingsModal(this.state), (card) => {
      card.querySelectorAll<HTMLElement>('[data-toggle]').forEach((el) =>
        el.addEventListener('click', () => {
          const key = el.dataset.toggle as 'sound' | 'vibration';
          this.state.settings[key] = !this.state.settings[key];
          feedbackSettings[key] = this.state.settings[key];
          el.classList.toggle('on', this.state.settings[key]);
          sfx('click');
          vibrate(10);
          saveGame(this.state);
        }),
      );
      const reset = card.querySelector<HTMLElement>('[data-reset]')!;
      reset.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          reset.textContent = 'Sicuro? Tocca ancora';
          return;
        }
        wipeSave();
        this.state = { ...loadGame() };
        location.reload();
      });
    });
  }

  /** Guadagni accumulati mentre il gioco era chiuso o in background. */
  checkOffline(): void {
    const report = computeOffline(this.state);
    this.state.lastSeen = Date.now();
    if (!report) return;
    give(this.state, report.gains);
    saveGame(this.state);
    this.hud.openModal(welcomeModal(report.seconds, report.gains), (card) => {
      card.querySelector('[data-collect]')!.addEventListener('click', () => {
        const rect = card.getBoundingClientRect();
        const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        for (const r of RESOURCE_IDS) if (report.gains[r] > 0) this.hud.fly(r, from, 6);
        sfx('coin');
        setTimeout(() => sfx('coin', 1.25), 150);
        vibrate([10, 30, 10]);
        this.hud.closeModal();
      });
    });
    sfx('quest');
  }

  // =========================================================== interfaccia "lenta"

  /** Aggiorna marker, obiettivo e statistiche (non serve farlo a ogni frame). */
  private refreshSlowUI(force = false): void {
    const s = this.state;
    this.hud.setIslandStats(beauty(s), inhabitants(s));
    this.hud.setRates(totalRate(s, this.raining));

    for (const [id, el] of this.buildingMarkers) {
      const lvl = levelOf(s, id);
      const def = BUILDINGS[id];
      const maxed = lvl >= def.levels.length;
      const afford = !maxed && canAfford(s, def.levels[lvl].cost);
      let key = '';
      if (lvl === 0) key = afford ? 'plus-ok' : 'plus';
      else if (afford) key = 'up';
      if (el.dataset.key === key && !force) continue;
      el.dataset.key = key;
      if (key) el.dataset.on = '1';
      else delete el.dataset.on;
      const inner = el.firstElementChild as HTMLElement;
      inner.innerHTML =
        key === 'plus' ? `<div class="bubble">${ICONS.plus}</div>`
        : key === 'plus-ok' ? `<div class="bubble green">${ICONS.plus}<div class="dot">!</div></div>`
        : key === 'up' ? `<div class="bubble green">${ICONS.up}<div class="dot">!</div></div>`
        : '';
    }

    for (const rt of this.zones.values()) {
      if (!rt.tag || rt.def.comingSoon || !rt.def.cost) continue;
      const ok = canAfford(s, rt.def.cost);
      const tag = rt.tag.querySelector('.price-tag') as HTMLElement;
      tag.classList.toggle('ready', ok);
      (tag.querySelector('.dot') as HTMLElement).style.display = ok ? '' : 'none';
    }

    const q = currentQuest(s);
    const isNew = this.lastQuestIndex !== s.quest.index && this.lastQuestIndex !== -1;
    this.lastQuestIndex = s.quest.index;
    this.hud.setQuest(q ? { ...q, from: q.def.from, text: q.def.text, reward: q.def.reward } : null, isNew);
    if (isNew) sfx('pop', 0.8);

    // freccia-guida sulle prime missioni
    const showPointer = s.quest.index < 3 && q && !q.done && !this.hud.sheetOpen;
    if (showPointer && !this.pointer) {
      this.pointer = this.hud.addAnchor(`<div class="bubble" style="background:linear-gradient(#fff2a0,#ffd23f)"><span style="transform:rotate(180deg);display:grid">${ICONS.up}</span></div>`, () => {
        const p = this.questFocus();
        if (!p) return null;
        const goal = currentQuest(this.state)?.def.goal;
        const b = goal?.kind === 'build' ? 3.0 : goal?.kind === 'gather' && goal.resource === 'wood' ? 3.6 : 1.6;
        return p.clone().setY(p.y + b);
      }, () => this.onQuestTap(), 8);
    } else if (!showPointer && this.pointer) {
      this.hud.removeAnchor(this.pointer);
      this.pointer = null;
    }

    // se il pannello aperto mostra costi, aggiorna i colori (solo se cambia qualcosa)
    if (this.openSheet && this.hud.sheetOpen) {
      if (this.openSheet.kind === 'building') this.renderBuildingSheet(this.openSheet.id);
      else if (!this.state.zones.includes(this.openSheet.id)) this.renderZoneSheet(this.openSheet.id);
    }
  }

  // =========================================================== loop

  update(dt: number): void {
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const s = this.state;

    updateTweens(dt);
    this.rig.update(dt);
    this.stage.update(this.time);

    // giorno e notte
    s.timeOfDay = (s.timeOfDay + dt / BALANCE.dayLengthSec) % 1;
    this.stage.setTimeOfDay(s.timeOfDay, this.rig.target);
    const night = this.stage.sky.night;
    this.hud.setSky(this.raining ? 'rain' : night > 0.5 ? 'moon' : 'sun');

    // meteo
    this.weatherTimer += dt;
    if (!this.raining && this.weatherTimer > 60) {
      this.weatherTimer = 0;
      if (Math.random() < BALANCE.rainChancePerMinute) this.startRain();
    }
    if (this.raining) {
      this.rainLeft -= dt;
      if (this.rainLeft <= 0) this.raining = false;
    }
    this.rain.intensity += ((this.raining ? 1 : 0) - this.rain.intensity) * Math.min(1, dt * 0.8);
    this.stage.rainDim = this.rain.intensity;
    this.rain.update(dt, this.rig.target);
    this.fireflies.update(this.time, night);

    // nebbia
    for (const rt of this.zones.values()) if (rt.fog) updateFog(rt.fog, this.time);

    // oggetti raccoglibili
    for (const g of this.gatherables) {
      g.update(dt, this.time);
      if (g.type === 'shell' && !g.obj.visible && g.respawnIn > 0) {
        g.respawnIn -= dt;
        if (g.respawnIn <= 0) {
          const rt = this.zones.get(g.zone as ZoneId)!;
          this.placeShell(g, rt);
          if (g.obj.visible) g.appear();
        }
      }
    }
    for (const c of this.campfires) {
      const f = c.userData.flame as THREE.Object3D;
      f.scale.set(1 + Math.sin(this.time * 17) * 0.08, 1 + Math.sin(this.time * 13) * 0.18, 1 + Math.cos(this.time * 15) * 0.08);
    }

    // produzione degli edifici, consegnata a intervalli con numerini
    for (const [id, view] of this.buildings) {
      view.update(this.time, night);
      const rate = buildingRate(s, id, this.raining);
      for (const r of Object.keys(rate) as ResourceId[]) view.buffer[r] = (view.buffer[r] ?? 0) + (rate[r] ?? 0) * dt;
      view.deliverTimer -= dt;
      if (view.deliverTimer <= 0) {
        view.deliverTimer = BALANCE.deliverEverySec;
        let lift = 0;
        for (const r of RESOURCE_IDS) {
          const n = Math.floor(view.buffer[r] ?? 0);
          if (n < 1) continue;
          view.buffer[r] -= n;
          s.res[r] += n;
          const p = view.topPoint();
          p.y += lift;
          lift += 0.7;
          this.hud.floatGain(p, r, n);
          this.hud.bump(r);
        }
        if (lift > 0) view.bounce();
      }
    }
    // lavoro degli abitanti
    this.laborBuffer += laborRate(s) * dt;
    this.laborTimer -= dt;
    if (this.laborTimer <= 0) {
      this.laborTimer = BALANCE.deliverEverySec * 1.5;
      const n = Math.floor(this.laborBuffer);
      if (n >= 1 && this.villagers.length) {
        this.laborBuffer -= n;
        s.res.coin += n;
        const v = this.villagers[Math.floor(Math.random() * this.villagers.length)];
        this.hud.floatGain(v.obj.position.clone().setY(v.obj.position.y + 1.4), 'coin', n);
        this.hud.bump('coin');
      }
    }

    // abitanti
    const discs = this.unlockedDiscs();
    for (const v of this.villagers) v.update(dt, discs, this.obstacles);

    // barche
    this.boatTimer -= dt;
    if (this.boatTimer <= 0) {
      this.boatTimer = Math.max(BALANCE.boatIntervalMinSec, BALANCE.boatIntervalSec - beauty(s) * 0.6) * (0.7 + Math.random() * 0.6);
      this.spawnBoat();
    }
    for (let i = this.boats.length - 1; i >= 0; i--) {
      const b = this.boats[i];
      b.update(dt, this.time);
      if (b.done) {
        this.stage.scene.remove(b.obj);
        this.interact.delete(b.obj);
        const m = this.boatMarkers.get(b);
        if (m) this.hud.removeAnchor(m);
        this.boatMarkers.delete(b);
        this.boats.splice(i, 1);
      }
    }

    this.particles.update(dt);
    this.hud.updateResources(s.res, dt);
    this.hud.updateWorldUI(this.stage.camera, dt);

    this.slowTimer -= dt;
    if (this.slowTimer <= 0) {
      this.slowTimer = 0.3;
      this.refreshSlowUI();
    }
    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      saveGame(s);
    }

    this.stage.render();
  }

  private startRain(): void {
    this.raining = true;
    this.rainLeft = BALANCE.rainDurationSec;
    const garden = levelOf(this.state, 'garden') > 0;
    this.hud.toast(garden ? `Piove! L'orto produce +${Math.round((BUILDINGS.garden.rainBonus ?? 0) * 100)}%` : 'Piove sull\'isola…', ICONS.rain);
  }

  /** Utile per il debug dalla console: game.cheat() */
  cheat(amount = 1000): void {
    for (const r of RESOURCE_IDS) this.state.res[r] += amount;
    this.hud.toast(`+${fmt(amount)} di tutto`);
  }
}
