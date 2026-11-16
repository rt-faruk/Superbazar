import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground">
      {banners.map((banner, i) => (
        <div
          key={banner.id}
          className={cn(
            "grid min-h-[380px] transition-opacity duration-700 md:min-h-[440px] md:grid-cols-2",
            i === index ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <div className="relative z-10 flex flex-col justify-center gap-5 p-8 sm:p-12">
            <span className="w-fit rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              AmarBazar picks
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              {banner.title}
            </h1>
            {banner.subtitle ? (
              <p className="max-w-md text-base text-primary-foreground/80 sm:text-lg">{banner.subtitle}</p>
            ) : null}
            {banner.link_url ? (
              <Button asChild size="lg" variant="harvest" className="w-fit rounded-full">
                <a href={banner.link_url}>
                  {banner.cta_label ?? "Shop now"}
                  <ArrowRight />
                </a>
              </Button>
            ) : null}
          </div>
          {banner.image_url ? (
            <div className="relative min-h-[220px]">
              <img
                src={banner.image_url}
                alt=""
                className="absolute inset-0 size-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/30 to-transparent max-md:bg-gradient-to-t" />
            </div>
          ) : null}
        </div>
      ))}
      {banners.length > 1 ? (
        <div className="absolute bottom-5 left-8 z-20 flex gap-2 sm:left-12">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-harvest" : "w-2 bg-primary-foreground/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
