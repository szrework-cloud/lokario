"use client";

import { useEffect, useRef } from "react";

interface VideoSectionProps {
  videoUrl: string;
  title?: string;
  description?: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: "video" | "square" | "wide";
}

export function VideoSection({
  videoUrl,
  title,
  description,
  className = "",
  autoplay = false,
  loop = false,
  muted = true,
  aspectRatio = "video",
}: VideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && autoplay && videoRef.current) {
          videoRef.current.play().catch((err) => {
            console.log("Erreur lors de la lecture automatique:", err);
          });
        }
      },
      { threshold: 0.3 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [autoplay]);

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
  };

  return (
    <section className={`relative overflow-hidden py-24 lg:py-32 bg-black ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="max-w-3xl mx-auto text-center mb-12">
            {title && (
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg text-white/70">{description}</p>
            )}
          </div>
        )}
        
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black/20 backdrop-blur-sm flex justify-center items-center">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-auto max-h-[80vh] object-contain"
              controls
              playsInline
              loop={loop}
              muted={muted}
              preload="metadata"
            >
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

