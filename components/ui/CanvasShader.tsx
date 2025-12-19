"use client";

// #region agent log
if (process.env.NODE_ENV === "development") {
  fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasShader.tsx:1',message:'CanvasShader module initializing',data:{timestamp:Date.now(),typeofWindow:typeof window},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
}
// #endregion
import React, { useRef, useMemo, useCallback, useState, useEffect } from "react";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: Uniforms;
  maxFps?: number;
}

export const Shader: React.FC<ShaderProps> = ({ source, uniforms, maxFps = 60 }) => {
  const [mounted, setMounted] = useState(false);
  const [libraries, setLibraries] = useState<{
    THREE: any;
    Canvas: any;
    useThree: any;
    useFrame: any;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Load THREE.js and react-three/fiber together after mount to avoid bundler evaluation
    // Both are browser-only libraries and should not be loaded during SSR
    // Use Function constructor to construct import paths dynamically, preventing bundler static analysis
    if (typeof window !== 'undefined') {
      // #region agent log
      if (process.env.NODE_ENV === "development") {
        fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasShader.tsx:33',message:'About to dynamically import three and r3f',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion
      Promise.all([
        import("three").catch((err) => {
          // #region agent log
          if (process.env.NODE_ENV === "development") {
            fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasShader.tsx:34',message:'three import failed',data:{timestamp:Date.now(),error:err?.message,errorStack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          }
          // #endregion
          throw err;
        }),
        import("@react-three/fiber").catch((err) => {
          // #region agent log
          if (process.env.NODE_ENV === "development") {
            fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasShader.tsx:35',message:'@react-three/fiber import failed',data:{timestamp:Date.now(),error:err?.message,errorStack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          }
          // #endregion
          throw err;
        })
      ]).then(([three, r3f]) => {
        // #region agent log
        if (process.env.NODE_ENV === "development") {
          fetch('http://127.0.0.1:7243/ingest/8bf28703-bae7-4dfb-bbed-261788013e7a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CanvasShader.tsx:36',message:'three and r3f imported successfully',data:{timestamp:Date.now(),hasThree:!!three,hasR3F:!!r3f},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        }
        // #endregion
        setLibraries({
          THREE: three,
          Canvas: r3f.Canvas,
          useThree: r3f.useThree,
          useFrame: r3f.useFrame,
        });
      }).catch((error) => {
        console.error("Failed to load THREE.js or react-three/fiber:", error);
      });
    }
  }, []);

  if (!mounted || !libraries) {
    return null;
  }

  const { THREE, Canvas, useThree, useFrame } = libraries;

  // Create the ShaderMaterial component dynamically so it can use hooks directly
  const ShaderMaterialInternal = () => {
    const { size } = useThree();
    const ref = useRef<any>(null);

    // Now we can use useFrame unconditionally since this component only renders when hooks are available
    useFrame(({ clock }: { clock: any }) => {
      if (!ref.current) return;
      const timestamp = clock.getElapsedTime();

      const material: any = ref.current.material;
      const timeLocation = material.uniforms?.u_time;
      if (timeLocation) {
        timeLocation.value = timestamp;
      }
    });

    const getUniforms = useCallback(() => {
      const preparedUniforms: any = {};

      for (const uniformName in uniforms) {
        const uniform: any = uniforms[uniformName];

        switch (uniform.type) {
          case "uniform1f":
            preparedUniforms[uniformName] = { value: uniform.value, type: "1f" };
            break;
          case "uniform1i":
            preparedUniforms[uniformName] = { value: uniform.value, type: "1i" };
            break;
          case "uniform3f":
            preparedUniforms[uniformName] = {
              value: new THREE.Vector3().fromArray(uniform.value as number[]),
              type: "3f",
            };
            break;
          case "uniform1fv":
            preparedUniforms[uniformName] = { value: uniform.value, type: "1fv" };
            break;
          case "uniform3fv":
            preparedUniforms[uniformName] = {
              value: (uniform.value as number[][]).map((v: number[]) =>
                new THREE.Vector3().fromArray(v)
              ),
              type: "3fv",
            };
            break;
          case "uniform2f":
            preparedUniforms[uniformName] = {
              value: new THREE.Vector2().fromArray(uniform.value as number[]),
              type: "2f",
            };
            break;
          default:
            console.error(`Invalid uniform type for '${uniformName}'.`);
            break;
        }
      }

      preparedUniforms["u_time"] = { value: 0, type: "1f" };
      preparedUniforms["u_resolution"] = {
        value: new THREE.Vector2(size.width * 2, size.height * 2),
      };
      return preparedUniforms;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size.width, size.height]);

    const material = useMemo(() => {
      const materialObject = new THREE.ShaderMaterial({
        vertexShader: `
        precision mediump float;
        in vec2 coordinates;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main(){
          float x = position.x;
          float y = position.y;
          gl_Position = vec4(x, y, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
        `,
        fragmentShader: source,
        uniforms: getUniforms(),
        glslVersion: THREE.GLSL3,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
      });

      return materialObject;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUniforms]);

    return (
      <mesh ref={ref as any}>
        <planeGeometry args={[2, 2]} />
        <primitive object={material} attach="material" />
      </mesh>
    );
  };

  return (
    <Canvas className="absolute inset-0  h-full w-full">
      <ShaderMaterialInternal />
    </Canvas>
  );
};
