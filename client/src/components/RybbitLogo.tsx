import Image from "next/image";
import { useEffect, useState } from "react";
import { useWhiteLabel } from "../hooks/useIsWhiteLabel";
import { Skeleton } from "./ui/skeleton";

export function RybbitLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt={process.env.NEXT_PUBLIC_APP_NAME || "Rybbit"} width={width} height={height} unoptimized={whiteLabelImage.startsWith('http')} />;
  }

  const defaultLogo = process.env.NEXT_PUBLIC_APP_LOGO || "/rybbit.svg";
  const isDefault = defaultLogo === "/rybbit.svg";

  return (
    <Image
      src={defaultLogo}
      alt={process.env.NEXT_PUBLIC_APP_NAME || "Rybbit"}
      width={width}
      height={height}
      className={isDefault ? "invert dark:invert-0" : ""}
      unoptimized={defaultLogo.startsWith('http')}
    />
  );
}

export function RybbitTextLogo({ width = 150, height = 34 }: { width?: number; height?: number }) {
  const { whiteLabelImage, isPending } = useWhiteLabel();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <Skeleton style={{ width, height }} />;
  }

  if (whiteLabelImage) {
    return <Image src={whiteLabelImage} alt="Rybbit" width={width} height={height} unoptimized={whiteLabelImage.startsWith('http')} />;
  }

  const defaultTextLogo = process.env.NEXT_PUBLIC_APP_TEXT_LOGO || "/rybbit-text.svg";
  const isDefault = defaultTextLogo === "/rybbit-text.svg";

  return (
    <Image
      src={defaultTextLogo}
      alt={process.env.NEXT_PUBLIC_APP_NAME || "Rybbit"}
      width={width}
      height={height}
      className={isDefault ? "dark:invert-0 invert" : ""}
      unoptimized={defaultTextLogo.startsWith('http')}
    />
  );
}
