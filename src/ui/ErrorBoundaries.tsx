import { useEffect, useState } from 'react';

/** Minimum usable window width for the 3D scenes + sidebar layout. */
const MIN_WIDTH = 1024;

/**
 * Top-level guard that intercepts two environment failures before any
 * Three.js work begins:
 *   1. WebGL2 unavailable (old browser, blocked by driver, headless test)
 *   2. Window too narrow (sidebar + 3D view don't fit)
 *
 * Both screens offer an "override" path so the user can see for themselves
 * rather than being hard-blocked.
 */
export function EnvironmentGuards({ children }: { children: React.ReactNode }) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [overrideWide, setOverrideWide] = useState(false);
  const [wide, setWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= MIN_WIDTH : true,
  );

  useEffect(() => {
    setWebglOk(checkWebGL2());
  }, []);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= MIN_WIDTH);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (webglOk === false) {
    return <WebGLErrorScreen />;
  }

  if (!wide && !overrideWide) {
    return (
      <NarrowScreenScreen onContinueAnyway={() => setOverrideWide(true)} />
    );
  }

  return <>{children}</>;
}

function checkWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const ok = !!gl;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }
    return ok;
  } catch {
    return false;
  }
}

function WebGLErrorScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0f1115] p-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-2xl font-semibold text-red-400">
          WebGL 不可用
        </h1>
        <p className="mb-4 text-sm text-gray-300">
          您的浏览器不支持 WebGL2，或者 WebGL 上下文创建失败。本演示器需要
          WebGL2 才能渲染 Three.js 场景。
        </p>
        <p className="text-xs text-gray-500">
          请使用最新版本的 Chrome、Edge、Firefox 或 Safari，并确认显卡驱动
          正常启用硬件加速。
        </p>
        <p className="mt-4 font-mono text-[10px] text-gray-600">
          WebGL2 is required for Three.js rendering.
        </p>
      </div>
    </div>
  );
}

function NarrowScreenScreen({
  onContinueAnyway,
}: {
  onContinueAnyway: () => void;
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0f1115] p-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 text-xl font-semibold text-yellow-400">
          屏幕过窄
        </h1>
        <p className="mb-4 text-sm text-gray-300">
          本演示器为桌面浏览器设计，最小屏幕宽度 1024px。当前布局下侧栏与
          3D 视图无法同时显示。
        </p>
        <button
          onClick={onContinueAnyway}
          className="rounded bg-panel-light px-4 py-2 text-xs text-gray-300 transition hover:bg-panel"
        >
          仍要继续（体验可能受损）
        </button>
      </div>
    </div>
  );
}
