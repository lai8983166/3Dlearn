import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import { useAppStore, type BloomState } from '@/store';
import { drawCornerQuad } from '@/three/cornerPreview';

const NUM_BLUR_PASSES = 3; // separable Gaussian quality
const DOWN_SCALE = 2; // downsample factor for the blur RT

/**
 * Bloom / HDR pipeline explainer.
 *
 * Five passes are each toggleable via store.layers:
 *   scene → bright → blurDown → blurUp → composite (+ ACES tonemap)
 *
 * Implementation notes:
 *   - We do NOT use UnrealBloomPass — its internal passes are opaque.
 *     Instead we build the chain ourselves with fullscreen shader passes
 *     so each pass has a clean input/output RT we can preview.
 *   - HDR RTs use HalfFloatType so values >1.0 survive.
 *   - The down-pyramid is approximated as a single lower-resolution blur;
 *     "blur up" is the same kernel back at full resolution. This keeps
 *     five RTs total, one per preview cell, while still teaching the
 *     separable-blur concept.
 */
export class BloomModule implements SceneModule {
  readonly id = 'bloom';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  private spheres: THREE.Mesh[] = [];
  private light: THREE.DirectionalLight;

  // Five render targets — one per pipeline pass.
  private rtScene: THREE.WebGLRenderTarget | null = null;
  private rtBright: THREE.WebGLRenderTarget | null = null;
  private rtDown: THREE.WebGLRenderTarget | null = null;
  private rtUp: THREE.WebGLRenderTarget | null = null;
  private rtFinal: THREE.WebGLRenderTarget | null = null;

  // Fullscreen quad infrastructure.
  private fsScene = new THREE.Scene();
  private fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private fsQuad: THREE.Mesh;

  private brightMat: THREE.ShaderMaterial;
  private blurMat: THREE.ShaderMaterial;
  private compositeMat: THREE.ShaderMaterial;
  private passthroughMat: THREE.ShaderMaterial;

  private lastState: BloomState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0a0a10');

    this.camera.position.set(0, 1.5, 6);
    this.camera.lookAt(0, 0, 0);

    // Row of 5 spheres with varying albedo/metalness — at least one will
    // exceed 1.0 under the bright directional light.
    const sphereGeo = new THREE.SphereGeometry(0.6, 48, 48);
    const configs: Array<{ color: string; metalness: number; roughness: number }> = [
      { color: '#202020', metalness: 0.0, roughness: 0.5 },
      { color: '#888888', metalness: 0.2, roughness: 0.4 },
      { color: '#dddddd', metalness: 0.5, roughness: 0.3 },
      { color: '#ffaa33', metalness: 0.8, roughness: 0.2 },
      { color: '#ffffff', metalness: 1.0, roughness: 0.1 },
    ];
    configs.forEach((c, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: c.color,
        metalness: c.metalness,
        roughness: c.roughness,
      });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.position.set((i - 2) * 1.6, 0.6, 0);
      this.scene.add(sphere);
      this.spheres.push(sphere);
    });

    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#15151a',
      roughness: 0.95,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    this.light = new THREE.DirectionalLight('#ffffff', 2.5);
    this.light.position.set(3, 5, 4);
    this.scene.add(this.light);
    this.scene.add(new THREE.AmbientLight('#445588', 0.2));

    // Fullscreen quad.
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.fsQuad = new THREE.Mesh(quadGeo, this.passthroughMat = makePassthrough());
    this.fsQuad.frustumCulled = false;
    this.fsScene.add(this.fsQuad);

    this.brightMat = makeBright();
    this.blurMat = makeBlur();
    this.compositeMat = makeComposite();

    this.lastState = useAppStore.getState().bloom;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.bloom !== this.lastState) {
        this.lastState = state.bloom;
        this.applyState(state.bloom);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    // We tonemap inside the composite shader — keep renderer neutral.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0.5, 0);

    this.applyState(this.lastState);
  }

  private applyState(s: BloomState) {
    if (this.disposed) return;
    this.light.intensity = s.lightIntensity;
    this.brightMat.uniforms.uThreshold.value = s.threshold;
    this.brightMat.uniforms.uSoftKnee.value = s.softKnee;
    this.compositeMat.uniforms.uStrength.value = s.compositeStrength;
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();
    const s = this.lastState;
    const w = renderer.domElement.width || 512;
    const h = renderer.domElement.height || 512;
    this.ensureTargets(w, h);

    // --- Pass 1: HDR scene render ---
    renderer.setRenderTarget(this.rtScene);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    // Build the pipeline — "current" is what the next pass reads.
    let current: THREE.Texture = this.rtScene!.texture;
    let blurResult: THREE.Texture | null = null;

    // --- Pass 2: Bright pass ---
    if (s.layers.bright) {
      this.runPass(renderer, this.rtBright!, this.brightMat, current);
      current = this.rtBright!.texture;
    }

    // --- Pass 3: Blur down (separable Gaussian at reduced resolution) ---
    if (s.layers.blurDown) {
      const downRt = this.rtDown!;
      for (let i = 0; i < NUM_BLUR_PASSES; i++) {
        // Horizontal then vertical each pass.
        this.blurMat.uniforms.uDirection.value.set(1.0 / downRt.width, 0);
        this.runPass(renderer, downRt, this.blurMat, current);
        this.blurMat.uniforms.uDirection.value.set(0, 1.0 / downRt.height);
        this.runPass(renderer, downRt, this.blurMat, downRt.texture);
        current = downRt.texture;
      }
    }

    // --- Pass 4: Blur up (upsample back to full resolution) ---
    if (s.layers.blurUp) {
      const upRt = this.rtUp!;
      this.passthroughMat.uniforms.tDiffuse.value = current;
      this.runPass(renderer, upRt, this.passthroughMat, current);
      // Light blur to soften the upsample.
      for (let i = 0; i < 2; i++) {
        this.blurMat.uniforms.uDirection.value.set(1.0 / upRt.width, 0);
        this.runPass(renderer, upRt, this.blurMat, upRt.texture);
        this.blurMat.uniforms.uDirection.value.set(0, 1.0 / upRt.height);
        this.runPass(renderer, upRt, this.blurMat, upRt.texture);
      }
      current = upRt.texture;
      blurResult = current;
    }

    // --- Pass 5: Composite + tonemap ---
    if (s.layers.composite) {
      this.compositeMat.uniforms.tScene.value = this.rtScene!.texture;
      this.compositeMat.uniforms.tBloom.value = blurResult;
      this.runPass(renderer, this.rtFinal!, this.compositeMat, null);
    } else {
      // No composite: passthrough scene (will clip >1.0 because no tonemap).
      this.runPass(renderer, this.rtFinal!, this.passthroughMat, this.rtScene!.texture);
    }

    // Blit final → screen.
    renderer.setRenderTarget(null);
    this.fsQuad.material = this.passthroughMat;
    this.passthroughMat.uniforms.tDiffuse.value = this.rtFinal!.texture;
    renderer.render(this.fsScene, this.fsCamera);

    // Corner previews of all five passes.
    const cells: Array<{ tex: THREE.Texture | null; label: string }> = [
      { tex: this.rtScene?.texture ?? null, label: 'Scene' },
      { tex: this.rtBright?.texture ?? null, label: 'Bright' },
      { tex: this.rtDown?.texture ?? null, label: 'BlurD' },
      { tex: this.rtUp?.texture ?? null, label: 'BlurU' },
      { tex: this.rtFinal?.texture ?? null, label: 'Final' },
    ];
    const cellW = 140;
    const cellH = 90;
    const gap = 6;
    const startY = 16;
    void cells;
    for (let i = 0; i < cells.length; i++) {
      drawCornerQuad(renderer, {
        texture: cells[i].tex,
        x: 16 + i * (cellW + gap),
        y: startY,
        w: cellW,
        h: cellH,
        fallbackColor: 0x1a1d24,
      });
    }
  }

  private runPass(
    renderer: THREE.WebGLRenderer,
    dst: THREE.WebGLRenderTarget,
    material: THREE.ShaderMaterial,
    src: THREE.Texture | null,
  ) {
    if (src && material.uniforms.tDiffuse) {
      material.uniforms.tDiffuse.value = src;
    }
    this.fsQuad.material = material;
    renderer.setRenderTarget(dst);
    renderer.clear();
    renderer.render(this.fsScene, this.fsCamera);
  }

  private ensureTargets(w: number, h: number) {
    if (this.rtScene && this.rtScene.width === w) return;

    this.rtScene?.dispose();
    this.rtBright?.dispose();
    this.rtDown?.dispose();
    this.rtUp?.dispose();
    this.rtFinal?.dispose();

    const hdr = (width: number, height: number) =>
      new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType,
        depthBuffer: false,
      });

    const downW = Math.max(2, Math.floor(w / DOWN_SCALE));
    const downH = Math.max(2, Math.floor(h / DOWN_SCALE));
    this.rtScene = hdr(w, h);
    this.rtBright = hdr(w, h);
    this.rtDown = hdr(downW, downH);
    this.rtUp = hdr(w, h);
    this.rtFinal = hdr(w, h);
  }

  onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe();
    this.controls?.dispose();

    if (this.renderer) {
      // Restore defaults so the next module starts clean.
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    this.rtScene?.dispose();
    this.rtBright?.dispose();
    this.rtDown?.dispose();
    this.rtUp?.dispose();
    this.rtFinal?.dispose();
    this.brightMat.dispose();
    this.blurMat.dispose();
    this.compositeMat.dispose();
    this.passthroughMat.dispose();
  }
}

// --- Shader source ---

const FS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function makePassthrough(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv);
      }
    `,
  });
}

function makeBright(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uThreshold: { value: 0.8 },
      uSoftKnee: { value: 0.5 },
    },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uThreshold;
      uniform float uSoftKnee;
      varying vec2 vUv;

      float luminance(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float lum = luminance(c);
        float knee = smoothstep(uThreshold - uSoftKnee, uThreshold + uSoftKnee, lum);
        vec3 bright = max(c * knee - uThreshold, 0.0);
        gl_FragColor = vec4(bright, 1.0);
      }
    `,
  });
}

function makeBlur(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uDirection: { value: new THREE.Vector2(1, 0) },
    },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uDirection;
      varying vec2 vUv;

      // 9-tap separable Gaussian. Run twice (horizontal then vertical) for a 2D blur.
      void main() {
        vec2 texel = uDirection;
        vec4 sum = vec4(0.0);
        float w0 = 0.227027;
        float w1 = 0.1945946;
        float w2 = 0.1216216;
        float w3 = 0.054054;
        float w4 = 0.016216;
        sum += texture2D(tDiffuse, vUv) * w0;
        sum += texture2D(tDiffuse, vUv + texel * 1.0) * w1;
        sum += texture2D(tDiffuse, vUv - texel * 1.0) * w1;
        sum += texture2D(tDiffuse, vUv + texel * 2.0) * w2;
        sum += texture2D(tDiffuse, vUv - texel * 2.0) * w2;
        sum += texture2D(tDiffuse, vUv + texel * 3.0) * w3;
        sum += texture2D(tDiffuse, vUv - texel * 3.0) * w3;
        sum += texture2D(tDiffuse, vUv + texel * 4.0) * w4;
        sum += texture2D(tDiffuse, vUv - texel * 4.0) * w4;
        gl_FragColor = sum;
      }
    `,
  });
}

function makeComposite(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      tBloom: { value: null },
      uStrength: { value: 1.0 },
    },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform sampler2D tBloom;
      uniform float uStrength;
      varying vec2 vUv;

      vec3 acesFilmic(vec3 x) {
        float a = 2.51;
        float b = 0.03;
        float c = 2.43;
        float d = 0.59;
        float e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      void main() {
        vec3 scene = texture2D(tScene, vUv).rgb;
        vec3 bloom = texture2D(tBloom, vUv).rgb;
        vec3 hdr = scene + uStrength * bloom;
        vec3 ldr = acesFilmic(hdr);
        // sRGB OETF approximation.
        vec3 outc = pow(ldr, vec3(1.0 / 2.2));
        gl_FragColor = vec4(outc, 1.0);
      }
    `,
  });
}
