import { useIsFocused } from 'expo-router';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as THREE from 'three';

export type PipMood = 'idle' | 'happy' | 'sad' | 'talk' | 'think';

/**
 * PIP, the 3D robot mascot. Built from primitive shapes so every part can be animated:
 * floats and blinks when idle, jumps and waves when happy, droops when sad,
 * moves its mouth when talking and tilts with a pulsing antenna when thinking.
 */
export function PipRobot({ mood = 'idle', size = 160 }: { mood?: PipMood; size?: number }) {
  const moodRef = useRef<PipMood>(mood);
  const focused = useIsFocused();
  const focusRef = useRef(focused);
  const [failed, setFailed] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);
  useEffect(() => {
    focusRef.current = focused;
  }, [focused]);
  useEffect(() => () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
  }, []);

  if (failed) {
    // Fallback if the phone cannot run WebGL.
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.5 }}>🤖</Text>
      </View>
    );
  }

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    try {
      const W = gl.drawingBufferWidth;
      const H = gl.drawingBufferHeight;
      const canvas = {
        width: W, height: H, style: {}, clientWidth: W, clientHeight: H,
        addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({ canvas: canvas as unknown as HTMLCanvasElement, context: gl as unknown as WebGL2RenderingContext, antialias: true, alpha: true });
      renderer.setPixelRatio(1);
      renderer.setSize(W, H, false);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
      camera.position.set(0, 0.1, 7);
      camera.lookAt(0, -0.25, 0);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xf2b8cc, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(2.5, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xcdb8ff, 1.0);
      rim.position.set(-3, 1, -2);
      scene.add(rim);

      const shell = new THREE.MeshStandardMaterial({ color: 0xf29bb8, roughness: 0.45, metalness: 0.05 });
      const pale = new THREE.MeshStandardMaterial({ color: 0xfff3f7, roughness: 0.6 });
      const screen = new THREE.MeshStandardMaterial({ color: 0x3b3346, roughness: 0.25, metalness: 0.2 });
      const glow = new THREE.MeshStandardMaterial({ color: 0x7ff3ff, emissive: 0x39d5ff, emissiveIntensity: 1.2 });
      const bulb = new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0xffb000, emissiveIntensity: 1 });
      const cheekM = new THREE.MeshStandardMaterial({ color: 0xff7fa6, transparent: true, opacity: 0.85 });

      const pip = new THREE.Group();
      scene.add(pip);

      // Body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.78, 48, 32), shell);
      body.scale.set(1, 0.9, 0.85);
      body.position.y = -0.95;
      pip.add(body);
      const belly = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), pale);
      belly.position.set(0, -0.9, 0.67);
      pip.add(belly);
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 16), glow);
      heart.position.set(0, -0.88, 0.7);
      pip.add(heart);

      // Head
      const head = new THREE.Group();
      head.position.y = 0.45;
      pip.add(head);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), shell);
      skull.scale.set(1.15, 0.95, 0.95);
      head.add(skull);
      const face = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 40), screen);
      face.scale.set(0.92, 0.7, 0.4);
      face.position.z = 0.62;
      head.add(face);

      const eyeGeo = new THREE.CapsuleGeometry(0.1, 0.16, 8, 16);
      const eyeL = new THREE.Mesh(eyeGeo, glow);
      const eyeR = new THREE.Mesh(eyeGeo, glow);
      eyeL.position.set(-0.32, 0.08, 1.0);
      eyeR.position.set(0.32, 0.08, 1.0);
      head.add(eyeL, eyeR);

      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 12, 32, Math.PI), glow);
      mouth.rotation.z = Math.PI; // smile
      mouth.position.set(0, -0.2, 1.0);
      head.add(mouth);

      const cheekGeo = new THREE.CircleGeometry(0.1, 24);
      const cheekL = new THREE.Mesh(cheekGeo, cheekM);
      const cheekR = new THREE.Mesh(cheekGeo, cheekM);
      cheekL.position.set(-0.62, -0.18, 0.86);
      cheekR.position.set(0.62, -0.18, 0.86);
      cheekL.rotation.y = -0.5;
      cheekR.rotation.y = 0.5;
      head.add(cheekL, cheekR);

      // Ears and antenna
      const earGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 28);
      const earL = new THREE.Mesh(earGeo, pale);
      const earR = new THREE.Mesh(earGeo, pale);
      earL.rotation.z = earR.rotation.z = Math.PI / 2;
      earL.position.x = -1.18;
      earR.position.x = 1.18;
      head.add(earL, earR);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12), pale);
      stalk.position.y = 1.1;
      head.add(stalk);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), bulb);
      tip.position.y = 1.38;
      head.add(tip);

      // Arms (pivot at shoulder)
      const mkArm = (side: number) => {
        const g = new THREE.Group();
        g.position.set(0.72 * side, -0.72, 0);
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.42, 8, 16), shell);
        arm.position.y = -0.28;
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), pale);
        hand.position.y = -0.6;
        g.add(arm, hand);
        g.rotation.z = 0.35 * side;
        pip.add(g);
        return g;
      };
      const armL = mkArm(-1);
      const armR = mkArm(1);

      // Ground shadow
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ color: 0x1b2340, transparent: true, opacity: 0.12 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.85;
      scene.add(shadow);

      const clock = new THREE.Clock();
      let nextBlink = 2;
      const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

      const loop = () => {
        raf.current = requestAnimationFrame(loop);
        if (!focusRef.current) return; // save battery when screen is hidden
        const t = clock.getElapsedTime();
        const m = moodRef.current;
        const k = 0.12;

        // Float / jump
        const bob = m === 'happy' ? Math.abs(Math.sin(t * 7)) * 0.35 : Math.sin(t * 2) * 0.08;
        pip.position.y = lerp(pip.position.y, m === 'sad' ? -0.12 + bob * 0.4 : bob, 0.3);
        pip.rotation.y = lerp(pip.rotation.y, m === 'think' ? 0.35 : Math.sin(t * 0.7) * 0.25, k);
        shadow.scale.setScalar(1 - pip.position.y * 0.6);

        // Head pose
        head.rotation.z = lerp(head.rotation.z, m === 'think' ? 0.25 : m === 'sad' ? -0.12 : Math.sin(t * 1.3) * 0.05, k);
        head.rotation.x = lerp(head.rotation.x, m === 'sad' ? 0.35 : m === 'happy' ? -0.15 : 0, k);

        // Blink
        let eyeY = m === 'happy' ? 0.45 : m === 'sad' ? 0.7 : 1;
        if (t > nextBlink) {
          const p = (t - nextBlink) / 0.15;
          if (p < 1) eyeY *= Math.abs(1 - 2 * p) + 0.05;
          else nextBlink = t + 2 + Math.random() * 3;
        }
        eyeL.scale.y = eyeR.scale.y = eyeY;
        const eyeOff = m === 'sad' ? -0.06 : m === 'think' ? 0.06 : 0;
        eyeL.position.y = eyeR.position.y = lerp(eyeL.position.y, 0.08 + eyeOff, k);

        // Mouth: smile, frown, or talking
        mouth.rotation.z = lerp(mouth.rotation.z, m === 'sad' ? 0 : Math.PI, 0.2);
        mouth.position.y = m === 'sad' ? -0.32 : -0.2;
        const talk = m === 'talk' ? 0.4 + Math.abs(Math.sin(t * 14)) * 1.1 : m === 'happy' ? 1.4 : 1;
        mouth.scale.set(m === 'think' ? 0.6 : 1, talk, 1);

        // Arms
        const wave = m === 'happy' ? Math.sin(t * 12) * 0.5 : 0;
        armL.rotation.z = lerp(armL.rotation.z, m === 'happy' ? -2.4 + wave : m === 'sad' ? -0.1 : -0.35 - Math.sin(t * 2) * 0.08, 0.2);
        armR.rotation.z = lerp(armR.rotation.z, m === 'happy' ? 2.4 - wave : m === 'sad' ? 0.1 : m === 'think' ? 2.2 : 0.35 + Math.sin(t * 2) * 0.08, 0.2);

        // Glow
        const pulse = m === 'think' ? 1 + Math.sin(t * 8) * 0.9 : 1 + Math.sin(t * 3) * 0.3;
        bulb.emissiveIntensity = pulse;
        glow.emissiveIntensity = m === 'sad' ? 0.5 : 1.2;
        cheekM.opacity = m === 'happy' ? 1 : 0.6;
        heart.scale.setScalar(1 + Math.sin(t * 5) * 0.15);

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      loop();
    } catch {
      setFailed(true);
    }
  }

  return <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />;
}
