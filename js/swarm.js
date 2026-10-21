// CYRANTA glass swarm. One set of glass units lives in a fixed layer, chases
// the pointer and rebuilds itself into a new shape for every section, so the
// swarm tells the story as the visitor scrolls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.querySelector('[data-swarm]');
const hud = document.querySelector('[data-hud]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 767px)').matches;
const N = mobile ? 220 : 420;
const GAP = 0.62;

// Seeded random so every visit builds the same swarm.
let seed = 11;
function rand() {
	seed = (seed + 0x6D2B79F5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function inBall() {
	const v = new THREE.Vector3();
	do { v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1); } while (v.lengthSq() > 1);
	return v;
}

const PALETTE = [0x5AC8FA, 0x5EE6B8, 0xFFC24B, 0xFF7EB6, 0xFF8A5C, 0xA5A2FF].map((h) => new THREE.Color(h));
const COOL = [PALETTE[0], PALETTE[1], PALETTE[5]];
const WARM = [PALETTE[2], PALETTE[3], PALETTE[4]];
const GRAY = new THREE.Color(0xB9BEC6);
const WHITE = new THREE.Color(0xFFFFFF);

const bots = Array.from({ length: N }, () => ({
	phase: rand() * Math.PI * 2,
	k: 12 + rand() * 18,
	home: inBall(),
	axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
	base: PALETTE[Math.floor(rand() * PALETTE.length)],
	pos: new THREE.Vector3((rand() * 2 - 1) * 34, (rand() * 2 - 1) * 20, (rand() * 2 - 1) * 12),
	vel: new THREE.Vector3(),
	quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6)),
	scale: 0,
	col: new THREE.Color(1, 1, 1),
	scene: 'hero',
	switchAt: 0
}));

// ---- Shapes. Each one writes a local position for unit i and may set the
// unit's scale and color through tScale / tColor.
let tScale = 1;
let tColor = null;

const side = Math.floor(Math.cbrt(N));
const rowIdx = [];
let kept = 0;
for (let i = 0; i < N; i++) { rowIdx[i] = i % 7 === 3 ? -1 : kept++; }
const ROW_COLS = mobile ? 11 : 21;
const ROW_COUNT = Math.ceil(kept / ROW_COLS);

const BAR_H = [4, 7, 6, 10, 9, 13, 12, 16, 15];
const barDepth = mobile ? 1 : 2;
const barPts = [];
BAR_H.forEach((h, k) => {
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < 2; x++) {
			for (let z = 0; z < barDepth; z++) {
				barPts.push(new THREE.Vector3((k - 4) * 1.45 + (x - 0.5) * 0.5, y * 0.5 - 3.6, (z - (barDepth - 1) / 2) * 0.5));
			}
		}
	}
});

let blockCount = 0;
const blockIdx = [];
for (let i = 0; i < N; i++) { blockIdx[i] = i % 10 === 0 ? -1 : blockCount++; }
const BW = mobile ? 7 : 9;
const BH = 6;
const BD = Math.ceil(blockCount / (BW * BH));

const shapes = {
	cube(i, t, v, b) {
		const c = (side - 1) / 2;
		if (i < side * side * side) {
			v.set((i % side - c) * GAP, (Math.floor(i / side) % side - c) * GAP, (Math.floor(i / (side * side)) - c) * GAP);
		} else {
			const a = i * 2.39996 + t * 0.7;
			v.set(Math.cos(a) * 4.4, Math.sin(i * 1.7 + t) * 1.4, Math.sin(a) * 4.4);
			tScale = 0.7;
		}
	},
	scatter(i, t, v, b) {
		v.set(b.home.x * 10, b.home.y * 5.5, b.home.z * 4);
		v.x += Math.sin(t * 0.35 + b.phase) * 0.9;
		v.y += Math.cos(t * 0.3 + b.phase * 1.3) * 0.9;
	},
	rows(i, t, v, b) {
		const j = rowIdx[i];
		if (j < 0) {
			v.set(b.home.x * 7, -9 - Math.abs(b.home.y) * 3, b.home.z * 2);
			tScale = 0.5;
			tColor = GRAY;
			return;
		}
		const r = Math.floor(j / ROW_COLS);
		v.set((j % ROW_COLS - (ROW_COLS - 1) / 2) * GAP, ((ROW_COUNT - 1) / 2 - r) * GAP * 1.2, 0);
		v.z += Math.sin(t * 1.6 + (j % ROW_COLS) * 0.4) * 0.12;
	},
	block(i, t, v, b) {
		const j = blockIdx[i];
		if (j < 0) {
			v.set(b.home.x * 3, 16 + b.home.y * 4, b.home.z * 3);
			tScale = 0.45;
			tColor = GRAY;
			return;
		}
		v.set((j % BW - (BW - 1) / 2) * 0.5, (Math.floor(j / BW) % BH - (BH - 1) / 2) * 0.5, (Math.floor(j / (BW * BH)) - (BD - 1) / 2) * 0.5);
	},
	helix(i, t, v, b) {
		const u = (i / N + t * 0.03) % 1;
		const a = u * Math.PI * 7 + (i % 2) * Math.PI;
		v.set((u - 0.5) * 17, Math.cos(a) * 1.9, Math.sin(a) * 1.9);
	},
	cleanroom(i, t, v, b) {
		if (i % 10 === 0) {
			const p = (t * 0.32 + b.phase / (Math.PI * 2)) % 1;
			v.set(Math.sin(b.phase * 3) * 0.3, -2.4 + p * 7.5, Math.cos(b.phase * 3) * 0.3);
			tScale = 0.75 * Math.sin(p * Math.PI);
			tColor = WHITE;
			return;
		}
		const left = i % 2 === 1;
		const breathe = 1 + Math.sin(t * 1.2 + (left ? 0 : 1.5)) * 0.05;
		v.copy(b.home).multiplyScalar(2.5 * breathe);
		v.x += left ? -4.4 : 4.4;
		tColor = left ? COOL[i % 3] : WARM[i % 3];
	},
	bars(i, t, v, b) {
		if (i < barPts.length) {
			v.copy(barPts[i]);
			return;
		}
		v.set(b.home.x * 6.5, 5 + Math.abs(b.home.y) * 2 + Math.sin(t + b.phase) * 0.4, b.home.z * 1.5);
		tScale = 0.4;
	},
	steps(i, t, v, b) {
		if (i % 7 === 0) {
			const p = (t * 0.2 + b.phase / (Math.PI * 2)) % 1;
			v.set(-6 + p * 12, Math.sin(p * Math.PI * 8) * 0.25, 0);
			tScale = 0.55;
			tColor = WHITE;
			return;
		}
		const c = i % 4;
		v.copy(b.home).multiplyScalar(0.9 + c * 0.28);
		v.x += -6 + c * 4;
	},
	rest(i, t, v, b) {
		v.set(b.home.x * 3.4, b.home.y * 2.6, b.home.z * 2.2);
		v.x += Math.sin(t * 0.25 + b.phase) * 0.5;
		v.y += Math.cos(t * 0.22 + b.phase) * 0.5;
	},
	ring(i, t, v, b) {
		const a = (i / N) * Math.PI * 2 + t * 0.3;
		const tube = i * 2.39996 + t * 0.8;
		const r = 4.2 + Math.cos(tube) * 0.8;
		v.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(tube) * 0.8);
	}
};

// ---- Scenes: which shape, where on screen, how it turns. `side` is where
// the swarm sits; the copy sits on the other side.
const SCENES = {
	hero: { shape: 'cube', side: 'right', scale: 1.25, spin: 0.22, tilt: 0.45, label: 'Assembling' },
	problem: { shape: 'scatter', side: 'right', scale: 0.9, spin: 0.02, tilt: 0, label: 'Scattered' },
	curation: { shape: 'rows', side: 'left', scale: 0.9, spin: 0, tilt: -0.4, label: 'Sorting' },
	datasets: { shape: 'block', side: 'right', scale: 1.2, spin: 0.25, tilt: 0.4, label: 'Sealing' },
	algorithms: { shape: 'helix', side: 'below', scale: 1, spin: 0, tilt: 0.3, label: 'Flowing' },
	cleanrooms: { shape: 'cleanroom', side: 'right', scale: 0.85, spin: 0, tilt: 0.12, label: 'Isolating', dark: true },
	snapshot: { shape: 'bars', side: 'right', scale: 0.85, spin: 0, tilt: 0.25, label: 'Building' },
	how: { shape: 'steps', side: 'middle', scale: 0.95, spin: 0, tilt: 0, label: 'Moving' },
	faq: { shape: 'rest', side: 'right', scale: 1, spin: 0.05, tilt: 0, label: 'Resting' },
	contact: { shape: 'ring', side: 'left', scale: 0.95, spin: 0, tilt: 0.5, label: 'Waiting for you' }
};
const ORDER = Object.keys(SCENES);

// ---- Three.js setup
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(6, 10, 8);
scene.add(key);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
camera.position.set(0, 0, 34);

const material = new THREE.MeshPhysicalMaterial({
	color: 0xffffff,
	roughness: 0.06,
	metalness: 0,
	clearcoat: 1,
	clearcoatRoughness: 0.04,
	iridescence: 0.8,
	iridescenceIOR: 1.35,
	envMapIntensity: 0.9,
	transparent: true,
	depthWrite: false
});
// Glass look: clear in the middle, bright and solid toward the edges.
material.onBeforeCompile = (shader) => {
	shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
		float fres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.0);
		gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.78, fres) + vec3(0.12) * pow(fres, 3.0);
		gl_FragColor.a = mix(0.62, 0.98, fres);`);
};

const mesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.48, 0.48, 0.48, 3, 0.12), material, N);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
mesh.frustumCulled = false;
bots.forEach((b, i) => mesh.setColorAt(i, b.col));
scene.add(mesh);

// The clean room's glass wall.
const wallMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6, transparent: true, opacity: 0, depthWrite: false });
const wall = new THREE.Mesh(new RoundedBoxGeometry(0.12, 7, 4.5, 2, 0.05), wallMat);
scene.add(wall);

// ---- Layout
let visW = 1;
let visH = 1;
function resize() {
	const w = innerWidth;
	const h = innerHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
	visW = visH * camera.aspect;
}
resize();
addEventListener('resize', resize);

function fit() { return mobile ? Math.min(visW / 22, 0.62) : Math.min(Math.max(visW / 38, 0.6), 1.15); }
function anchorFor(s, out) {
	if (mobile) { return out.set(0, visH * 0.27, 0); }
	if (s.side === 'right') { return out.set(visW * 0.23, 0, 0); }
	if (s.side === 'left') { return out.set(-visW * 0.23, 0, 0); }
	if (s.side === 'below') { return out.set(0, -visH * 0.14, 0); }
	return out.set(0, visH * 0.02, 0);
}

// ---- Pointer: the swarm drifts toward it and makes room around it.
const pointer = new THREE.Vector3(9999, 9999, 0);
const pointerNdc = new THREE.Vector2(0, 0);
let pointerActive = false;
function setPointer(x, y) {
	pointerNdc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
	const v = new THREE.Vector3(pointerNdc.x, pointerNdc.y, 0.5).unproject(camera).sub(camera.position).normalize();
	pointer.copy(camera.position).addScaledVector(v, -camera.position.z / v.z);
	pointerActive = true;
}
addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
addEventListener('pointerdown', (e) => setPointer(e.clientX, e.clientY), { passive: true });
document.addEventListener('pointerleave', () => { pointerActive = false; });

// ---- Which section is on screen
const sections = [...document.querySelectorAll('[data-scene]')];
let active = 'hero';
const clock = new THREE.Clock();
function setScene(name) {
	if (name === active || !SCENES[name]) { return; }
	active = name;
	const now = clock.elapsedTime;
	// Cascade: units leave a few at a time, never all at once.
	bots.forEach((b) => { b.switchAt = now + (reduced ? 0 : rand() * 0.6); });
	writeHud();
}
function writeHud() {
	const s = SCENES[active];
	hud.textContent = String(ORDER.indexOf(active) + 1).padStart(2, '0') + ' / ' + s.label + ' · ' + N + ' units';
	hud.classList.toggle('is-dark', !!s.dark);
}
function detect() {
	const mid = innerHeight * 0.5;
	for (const s of sections) {
		const r = s.getBoundingClientRect();
		if (r.top <= mid && r.bottom > mid) { setScene(s.dataset.scene); return; }
	}
}
addEventListener('scroll', detect, { passive: true });
detect();
writeHud();

// ---- Per-scene transform, computed once per frame
const follow = new THREE.Vector3();
const frames = {};
ORDER.forEach((n) => { frames[n] = { anchor: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1 }; });
const euler = new THREE.Euler();
function updateFrames(t) {
	const f = fit();
	for (const n of ORDER) {
		const s = SCENES[n];
		const fr = frames[n];
		anchorFor(s, fr.anchor).add(follow);
		const yaw = reduced ? 0 : t * s.spin + Math.sin(t * 0.25) * 0.2 + pointerNdc.x * 0.25;
		euler.set(s.tilt + (reduced ? 0 : -pointerNdc.y * 0.15), yaw, 0);
		fr.quat.setFromEuler(euler);
		fr.scale = s.scale * f;
	}
}

// ---- Loop
const local = new THREE.Vector3();
const target = new THREE.Vector3();
const acc = new THREE.Vector3();
const wob = new THREE.Quaternion();
const spinQ = new THREE.Quaternion();
const tq = new THREE.Quaternion();
const m = new THREE.Matrix4();
const sv = new THREE.Vector3();
const goalColor = new THREE.Color();
const followGoal = new THREE.Vector3();
const R = 2.4;

function frame() {
	const dt = Math.min(clock.getDelta(), 1 / 30);
	const t = clock.elapsedTime;

	// The whole swarm leans toward the pointer.
	if (pointerActive && !reduced && !mobile) {
		followGoal.set(pointer.x * 0.14, pointer.y * 0.14, 0);
	} else {
		followGoal.set(0, 0, 0);
	}
	follow.lerp(followGoal, 1 - Math.exp(-dt * 1.8));
	updateFrames(t);

	for (let i = 0; i < N; i++) {
		const b = bots[i];
		if (b.scene !== active && t >= b.switchAt) { b.scene = active; }
		const s = SCENES[b.scene];
		const fr = frames[b.scene];

		tScale = 1;
		tColor = null;
		shapes[s.shape](i, t, local, b);
		target.copy(local).applyQuaternion(fr.quat).multiplyScalar(fr.scale).add(fr.anchor);

		if (reduced) {
			b.pos.copy(target);
			b.vel.set(0, 0, 0);
		} else {
			const damp = 2 * Math.sqrt(b.k) * 0.72;
			acc.copy(target).sub(b.pos).multiplyScalar(b.k).addScaledVector(b.vel, -damp);
			// Make room around the pointer.
			if (pointerActive) {
				const dx = b.pos.x - pointer.x;
				const dy = b.pos.y - pointer.y;
				const d2 = dx * dx + dy * dy;
				if (d2 < R * R && d2 > 0.0001) {
					const d = Math.sqrt(d2);
					const push = (R - d) * 90;
					acc.x += (dx / d) * push;
					acc.y += (dy / d) * push;
					acc.z += push * 0.3;
				}
			}
			b.vel.addScaledVector(acc, dt);
			b.pos.addScaledVector(b.vel, dt);
		}

		// Orientation: line up with the shape, tumble while flying.
		const speed = b.vel.length();
		wob.setFromAxisAngle(b.axis, reduced ? 0 : Math.sin(t * 0.9 + b.phase) * 0.22);
		tq.copy(fr.quat).multiply(wob);
		b.quat.slerp(tq, 1 - Math.exp(-dt * 3));
		if (speed > 0.4) {
			spinQ.setFromAxisAngle(b.axis, Math.min(speed, 30) * dt * 0.18);
			b.quat.multiply(spinQ);
		}

		b.scale += (fr.scale * tScale - b.scale) * (1 - Math.exp(-dt * 4));
		goalColor.copy(tColor || b.base);
		b.col.lerp(goalColor, 1 - Math.exp(-dt * 3));

		sv.setScalar(Math.max(b.scale, 0.0001));
		m.compose(b.pos, b.quat, sv);
		mesh.setMatrixAt(i, m);
		mesh.setColorAt(i, b.col);
	}
	mesh.instanceMatrix.needsUpdate = true;
	mesh.instanceColor.needsUpdate = true;

	const crf = frames.cleanrooms;
	wall.position.copy(crf.anchor);
	wall.quaternion.copy(crf.quat);
	wall.scale.setScalar(crf.scale);
	wallMat.opacity += ((active === 'cleanrooms' ? 0.32 : 0) - wallMat.opacity) * (1 - Math.exp(-dt * 3));
	wall.visible = wallMat.opacity > 0.01;

	renderer.render(scene, camera);
}

renderer.setAnimationLoop(frame);
document.addEventListener('visibilitychange', () => {
	renderer.setAnimationLoop(document.hidden ? null : frame);
	if (!document.hidden) { clock.getDelta(); }
});
