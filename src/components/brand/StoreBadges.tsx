import Image from "next/image";

export function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a href="https://www.apple.com/app-store/" className="focus-ring inline-flex" aria-label="Download on the App Store">
        <Image
          src="/brand/app-store-badge.svg"
          alt="Download on the App Store"
          width={148}
          height={50}
          className="h-12 w-auto"
        />
      </a>
      <a href="https://play.google.com/store" className="focus-ring inline-flex" aria-label="Get it on Google Play">
        <Image
          src="/brand/google-play-badge.png"
          alt="Get it on Google Play"
          width={155}
          height={60}
          className="h-[58px] w-auto"
        />
      </a>
    </div>
  );
}
