"use client";

import React, { useRef, useMemo, useCallback, useState, useEffect } from "react";
import * as THREE from "three";

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
  const [r3fModule, setR3fModule] = useState<{
    Canvas: any;
    useThree: any;
    useFrame: any;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Load react-three/fiber only after mount and React is initialized
    if (typeof window !== 'undefined') {
      import("@react-three/fiber").then((r3f) => {
        setR3fModule({
          Canvas: r3f.Canvas,
          useThree: r3f.useThree,
          useFrame: r3f.useFrame,
        });
      }).catch((error) => {
        console.error("Failed to load react-three/fiber:", error);
      });
    }
  }, []);

  if (!mounted || !r3fModule) {
    return null;
  }

  const { Canvas, useThree, useFrame } = r3fModule;

  // Create the ShaderMaterial component dynamically so it can use hooks directly
  const ShaderMaterialInternal = () => {
    const { size } = useThree();
    const ref = useRef<THREE.Mesh>(null);

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
    }, [uniforms, size.width, size.height]);

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
    }, [source, getUniforms]);

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
