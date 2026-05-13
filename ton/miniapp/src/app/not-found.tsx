"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/I18nProvider";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Card className="space-y-3 text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-sm text-muted">{t("errors.invalidInvite")}</p>
      <Link href="/" className="contents">
        <Button>{t("nav.home")}</Button>
      </Link>
    </Card>
  );
}
