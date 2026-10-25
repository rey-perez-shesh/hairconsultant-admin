"use client";

import { Box, ImageOff, Pencil, Plus, Search, Sparkles, Upload, Wand2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-shell";
import { filterOptions, OptionSelect } from "@/components/filter-select";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "@/lib/admin-api";
import { importBundledThumbnails, setHaircutActive, upgradeLegacyHaircuts } from "@/lib/catalogue";
import { useHaircuts } from "@/lib/hooks";
import {
  AR_TYPE_LABELS,
  AR_TYPES,
  displayThumbnail,
  GENDER_STYLES,
  HAIR_LENGTHS,
  HAIR_TEXTURES,
  isUpgraded,
  label,
  type Haircut,
} from "@/lib/model";

function Thumb({ haircut }: { haircut: Haircut }) {
  const src = displayThumbnail(haircut);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-12 rounded-lg bg-muted object-contain" loading="lazy" />
  ) : (
    <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground" title="No thumbnail in Storage yet">
      <ImageOff className="size-4" />
    </div>
  );
}

function ArBadge({ haircut }: { haircut: Haircut }) {
  const type = haircut.arType ?? "AUTO";
  if (type === "NONE") return <Badge variant="outline">No try-on</Badge>;
  if (type === "AUTO") return <Badge variant="secondary">Bundled</Badge>;
  return (
    <Badge>
      {type === "GLB" ? <Box /> : <Sparkles />}
      {type === "GLB" ? "3D" : "DeepAR"}
      {haircut.arAssetUrl ? ` v${haircut.arAssetVersion}` : " (no file)"}
    </Badge>
  );
}

/** Shown until every legacy document is upgraded and thumbnails are imported. */
function SetupCard({ haircuts }: { haircuts: Haircut[] }) {
  const legacyCount = haircuts.filter((h) => !isUpgraded(h)).length;
  const missingThumbs = haircuts.filter((h) => !h.thumbnailUrl && h.imageUrl?.includes("/drawable/")).length;
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (legacyCount === 0 && missingThumbs === 0) return null;

  const upgrade = async () => {
    setBusy("Upgrading…");
    try {
      const count = await upgradeLegacyHaircuts(haircuts);
      toast.success(`Upgraded ${count} styles.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const importThumbs = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const result = await importBundledThumbnails(haircuts, [...files], (done, total) =>
        setBusy(`Uploading ${done}/${total}…`),
      );
      toast.success(`Imported ${result.imported} thumbnails.`, {
        description: result.unmatched.length ? `Not used by any style: ${result.unmatched.join(", ")}` : undefined,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Card className="mb-6 border-dashed">
      <CardHeader>
        <CardTitle>Finish catalogue setup</CardTitle>
        <CardDescription>
          The app used to copy its built-in catalogue into Firestore. These one-time steps make those styles fully
          editable here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-medium">1. Upgrade {legacyCount} styles</span>{" "}
            <span className="text-muted-foreground">— adds visibility, order and try-on settings.</span>
          </p>
          <Button onClick={upgrade} disabled={legacyCount === 0 || busy !== null}>
            <Wand2 /> {legacyCount === 0 ? "Done" : "Upgrade"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-medium">2. Import {missingThumbs} bundled thumbnails</span>{" "}
            <span className="text-muted-foreground">
              — select every <code>thumb_*.png</code> in <code>HairConsultant/app/src/main/res/drawable</code>.
            </span>
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(e) => importThumbs(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={legacyCount > 0 || missingThumbs === 0 || busy !== null}
          >
            <Upload /> {busy ?? "Choose files"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CataloguePage() {
  const { data: haircuts, loading, error } = useHaircuts();
  const [search, setSearch] = useState("");
  const [length, setLength] = useState("ALL");
  const [texture, setTexture] = useState("ALL");
  const [gender, setGender] = useState("ALL");
  const [arType, setArType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return haircuts.filter(
      (h) =>
        (!q || h.name.toLowerCase().includes(q) || h.id.toLowerCase().includes(q)) &&
        (length === "ALL" || h.length === length) &&
        (texture === "ALL" || h.texture === texture) &&
        (gender === "ALL" || h.genderStyle === gender) &&
        (arType === "ALL" || (h.arType ?? "AUTO") === arType) &&
        (status === "ALL" || (status === "ACTIVE") === (h.isActive !== false)),
    );
  }, [haircuts, search, length, texture, gender, arType, status]);

  const toggle = async (haircut: Haircut, active: boolean) => {
    try {
      await setHaircutActive(haircut, active);
      toast.success(`${haircut.name} is now ${active ? "visible" : "hidden"} in the app.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        title="Catalogue"
        description={`${haircuts.length} styles · ${haircuts.filter((h) => h.isActive !== false).length} visible in the app`}
        actions={
          <Link href="/catalogue/edit" className={buttonVariants()}>
            <Plus /> New style
          </Link>
        }
      />

      {!loading && <SetupCard haircuts={haircuts} />}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or id"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search styles"
          />
        </div>
        <OptionSelect ariaLabel="Length" value={length} onChange={setLength} options={filterOptions("All lengths", HAIR_LENGTHS, label)} />
        <OptionSelect ariaLabel="Texture" value={texture} onChange={setTexture} options={filterOptions("All textures", HAIR_TEXTURES, label)} />
        <OptionSelect ariaLabel="Style for" value={gender} onChange={setGender} options={filterOptions("All genders", GENDER_STYLES, label)} />
        <OptionSelect
          ariaLabel="Try-on"
          value={arType}
          onChange={setArType}
          options={filterOptions("All try-on types", AR_TYPES, (v) => AR_TYPE_LABELS[v as keyof typeof AR_TYPE_LABELS])}
        />
        <OptionSelect
          ariaLabel="Visibility"
          value={status}
          onChange={setStatus}
          options={{ ALL: "Visible and hidden", ACTIVE: "Visible only", HIDDEN: "Hidden only" }}
        />
      </div>

      {error && <p className="mb-4 text-sm text-destructive">Couldn&apos;t load the catalogue: {error}</p>}

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16" />
              <TableHead>Style</TableHead>
              <TableHead className="hidden md:table-cell">Length · Texture</TableHead>
              <TableHead className="hidden lg:table-cell">Face shapes</TableHead>
              <TableHead className="hidden sm:table-cell">Try-on</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Order</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {haircuts.length === 0
                    ? "No styles in Firestore yet. Open the app once (it seeds the bundled catalogue) or add a style."
                    : "No styles match these filters."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((h) => (
              <TableRow key={h.id} className={h.isActive === false ? "opacity-60" : undefined}>
                <TableCell>
                  <Thumb haircut={h} />
                </TableCell>
                <TableCell>
                  <Link href={`/catalogue/edit?id=${encodeURIComponent(h.id)}`} className="font-medium hover:underline">
                    {h.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">{h.id}</div>
                  <div className="text-xs text-muted-foreground md:hidden">
                    {label(h.length)} · {label(h.texture)}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {label(h.length)} · {label(h.texture)}
                  <div className="text-xs text-muted-foreground">{label(h.genderStyle)}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(h.recommendedFaceShapes ?? []).map((shape) => (
                      <Badge key={shape} variant="outline">
                        {label(shape)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <ArBadge haircut={h} />
                </TableCell>
                <TableCell className="hidden sm:table-cell text-right tabular-nums">{h.sortOrder ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={h.isActive !== false}
                    disabled={!isUpgraded(h)}
                    onCheckedChange={(checked) => toggle(h, checked)}
                    aria-label={`Show ${h.name} in the app`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/catalogue/edit?id=${encodeURIComponent(h.id)}`}
                    className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    aria-label={`Edit ${h.name}`}
                  >
                    <Pencil />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
