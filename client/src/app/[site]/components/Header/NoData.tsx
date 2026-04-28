import {
  SiAngular,
  SiAstro,
  SiDocusaurus,
  SiDrupal,
  SiFramer,
  SiGatsby,
  SiGoogletagmanager,
  SiHugo,
  SiJekyll,
  SiLaravel,
  SiNextdotjs,
  SiNuxt,
  SiReact,
  SiRemix,
  SiShopify,
  SiSquarespace,
  SiSvelte,
  SiVuedotjs,
  SiWebflow,
  SiWix,
  SiWoocommerce,
  SiWordpress,
  SiMintlify,
} from "@icons-pack/react-simple-icons";
import React from "react";
import { useGetSite, useSiteHasData } from "../../../../api/admin/hooks/useSites";
import { CodeSnippet } from "../../../../components/CodeSnippet";
import { Alert } from "../../../../components/ui/alert";
import { useStore } from "../../../../lib/store";

// Custom Card Component
interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

function Card({ icon, title, description, href }: CardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col py-2 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-750 hover:bg-white dark:hover:bg-neutral-900 transition-all duration-200"
    >
      <div className="flex items-center gap-2">
        <div className="text-neutral-600 dark:text-neutral-300 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
          {icon}
        </div>
        <h3 className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{title}</h3>
      </div>
      {description && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{description}</p>}
    </a>
  );
}

export function NoData() {
  const { site } = useStore();
  const { data: siteHasData, isLoading } = useSiteHasData(site);
  const { data: siteMetadata, isLoading: isLoadingSiteMetadata } = useGetSite(site);

  if (!siteHasData && !isLoading && !isLoadingSiteMetadata) {
    return (
      <>
        <Alert className="mt-4 p-4 bg-amber-50 border-amber-400/80 dark:bg-neutral-900 dark:border-amber-600/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              <div className="font-medium">Waiting for analytics from {siteMetadata?.domain}...</div>
            </div>
            <div className="text-xs text-muted-foreground">Place this snippet in the &lt;head&gt; of your website:</div>
            <CodeSnippet
              language="HTML"
              code={`<script\n    src="${globalThis.location.origin}/api/script.js"\n    data-site-id="${siteMetadata?.id ?? siteMetadata?.siteId}"\n    defer\n></script>`}
              className="text-xs"
            />
          </div>
        </Alert>
      </>
    );
  }

  return null;
}
