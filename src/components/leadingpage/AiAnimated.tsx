"use client";

import { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const messages = [
  {
    text: "Hello! 👋 Welcome to SALE AGENT!",
    duration: 4000,
  },
  {
    text: "I'm your AI Sales Representative that helps automate customer conversations.",
    duration: 5000,
  },
  {
    text: "Connect your Facebook Page or Telegram bot, and I'll handle inquiries 24/7!",
    duration: 5000,
  },
  {
    text: "I speak Khmer & English, recommend products using RAG technology, and help close sales!",
    duration: 5000,
  },
];

// 3D Model Component
function RobotModel({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  
  useEffect(() => {
    // Make the model cast and receive shadows
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive 
      object={scene} 
      scale={1} 
      position={[0, -1, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// Fallback component if model doesn't load
function FallbackRobot() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8b5cf6" />
    </mesh>
  );
}

// Scene component
function Scene({ modelPath }: { modelPath: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#8b5cf6" />
      
      <Suspense fallback={<FallbackRobot />}>
        <RobotModel modelPath={modelPath} />
      </Suspense>
      
      <ContactShadows 
        position={[0, -1.5, 0]} 
        opacity={0.4} 
        scale={5} 
        blur={2.5} 
        far={4.5} 
      />
      
      <OrbitControls 
        enableZoom={false} 
        autoRotate 
        autoRotateSpeed={1}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

export default function AiAnimated() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  
  // Load model from CDN or local path
  // Priority: Environment variable > Local path
  // Example CDN URLs:
  // - https://cdn.jsdelivr.net/gh/your-repo/models/robot.glb
  // - https://your-cdn.com/models/robot.glb
  // - https://storage.googleapis.com/your-bucket/models/robot.glb
  const modelPath = 
    process.env.NEXT_PUBLIC_3D_MODEL_URL || 
    "/models/robot.glb"; // Fallback to local path

  useEffect(() => {
    const message = messages[currentMessageIndex];
    
    // Show typing indicator
    setIsTyping(true);
    setShowMessage(false);
    
    const typingTimeout = setTimeout(() => {
      setIsTyping(false);
      setShowMessage(true);
    }, 1500);

    // Move to next message after duration
    const messageTimeout = setTimeout(() => {
      setShowMessage(false);
      setIsTyping(false);
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 1500 + message.duration);

    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(messageTimeout);
    };
  }, [currentMessageIndex]);

  return (
    <div className="relative w-full max-w-lg flex flex-col items-center">
      {/* Speech Bubble */}
      <div className="relative mb-6 w-full">
        <div
          className={`relative bg-gray-800 border-2 border-purple-500/50 rounded-3xl p-6 shadow-2xl transition-all duration-500 ${
            showMessage ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
          }`}
        >
          {/* Speech bubble tail */}
          <div className="absolute -bottom-4 left-1/4 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-gray-800"></div>
            <div className="absolute top-[-2px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-purple-500/50"></div>
          </div>

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
              <span className="text-gray-400 text-sm ml-2">AI is typing...</span>
            </div>
          )}

          {/* Message text */}
          {showMessage && !isTyping && (
            <p className="text-gray-100 text-lg leading-relaxed animate-fade-in">
              {messages[currentMessageIndex].text}
            </p>
          )}
        </div>
      </div>

      {/* AI Character - 3D Model */}
      <div className="relative flex flex-col items-center">
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-teal-500/30 rounded-full blur-3xl animate-pulse"></div>
          
          {/* 3D Canvas */}
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <Canvas
              camera={{ position: [0, 0, 5], fov: 50 }}
              gl={{ antialias: true, alpha: true }}
              shadows
            >
              <Scene modelPath={modelPath} />
            </Canvas>
          </div>

          {/* Floating particles */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-purple-400 rounded-full opacity-60"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animation: `float-particle ${3 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-sm rounded-full border border-purple-500/50">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300 font-medium">AI Agent Online</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
