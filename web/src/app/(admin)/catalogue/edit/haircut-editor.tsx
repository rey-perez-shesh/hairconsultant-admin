"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, ImageOff, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/admin-shell";
import { ConfirmDialog, FaceShapeTag } from "@/components/common";
import { OptionSelect } from "@/components/filter-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/admin-api";
import {
  deleteHaircut,
  newHaircutId,
  saveHaircut,
  validateArAsset,
  validateThumbnail,
} from "@/lib/catalogue";
import { db } from "@/lib/firebase";
import {
  AR_TYPE_LABELS,
  AR_TYPES,
  DEFAULT_GLB_FIT,
  displayThumbnail,
  FACE_SHAPES,
  GENDER_STYLES,
  HAIR_LENGTHS,
  HAIR_TEXTURES,
  label,
  TREATMENTS,
  type Haircut,
} from "@/lib/model";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(2000),
  length: z.enum(HAIR_LENGTHS),
  texture: z.enum(HAIR_TEXTURES),
  genderStyle: z.enum(GENDER_STYLES),
  treatment: z.enum(TREATMENTS),
  recommendedFaceShapes: z.array(z.enum(FACE_SHAPES)).min(1, "Pick at least one face shape"),
  isActive: z.boolean(),
  sortOrder: z.number({ error: "Enter a number" }).int().min(0).max(9999),
  arType: z.enum(AR_TYPES),
  glbFit: z.object({
    scaleMul: z.number().min(0.1).max(3),
    offsetX: z.number().min(-1).max(1),
    offsetY: z.number().min(-1).max(1),
    offsetZ: z.number().min(-1).max(1),
    yawOffset: z.number().min(-360).max(360),
  }),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: "",
  description: "",
  length: "SHORT",
  texture: "STRAIGHT",
  genderStyle: "UNISEX",
  treatment: "NONE",
  recommendedFaceShapes: [],
  isActive: true,
  sortOrder: 100,
  arType: "NONE",
  glbFit: DEFAULT_GLB_FIT,
};

const AR_HINTS: Record<FormValues["arType"], string> = {
  AUTO: "Uses whatever try-on is built into the app for this style (DeepAR, GLB or a flat overlay), if any.",
  DEEPAR: "Upload a .deepar effect exported from DeepAR Studio. The app downloads it the first time someone tries it on.",
  GLB: "Upload a .glb hair model. Use the fit values to line it up on the head, then check it in the app.",
  NONE: "The try-on button is hidden for this style.",
};

const FIT_FIELDS = [
  { key: "scaleMul", label: "Scale", step: 0.01 },
  { key: "offsetX", label: "Offset X", step: 0.01 },
  { key: "offsetY", label: "Offset Y", step: 0.01 },
  { key: "offsetZ", label: "Offset Z", step: 0.01 },
  { key: "yawOffset", label: "Yaw (°)", step: 1 },
] as const;

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function GlbPreview({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true));
  }, []);
  if (!ready) return <div className="h-64 rounded-lg bg-muted" />;
  return (
    <model-viewer
      src={src}
      alt="3D hair model preview"
      camera-controls=""
      auto-rotate=""
      shadow-intensity="0.6"
      style={{ width: "100%", height: "16rem", borderRadius: "0.5rem", background: "var(--muted)" }}
    />
  );
}

export function HaircutEditor() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const isNew = !id;
  const [existing, setExisting] = useState<Haircut | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [arAsset, setArAsset] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, formState } = form;
  const [arType, name, length, texture] = useWatch({ control, name: ["arType", "name", "length", "texture"] });

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "haircuts", id))
      .then((snap) => {
        if (!snap.exists()) {
          toast.error("That style no longer exists.");
          router.replace("/catalogue");
          return;
        }
        const data = { ...(snap.data() as Omit<Haircut, "id">), id: snap.id };
        setExisting(data);
        reset({
          name: data.name,
          description: data.description ?? "",
          length: data.length,
          texture: data.texture,
          genderStyle: data.genderStyle ?? "UNISEX",
          treatment: data.treatment ?? "NONE",
          recommendedFaceShapes: data.recommendedFaceShapes ?? [],
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
          arType: data.arType ?? "AUTO",
          glbFit: { ...DEFAULT_GLB_FIT, ...data.glbFit },
        });
      })
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [id, reset, router]);

  const thumbnailPreview = useObjectUrl(thumbnail) ?? (existing ? displayThumbnail(existing) : null);
  const newAssetUrl = useObjectUrl(arAsset);
  const existingAssetMatches = existing?.arAssetUrl && existing.arAssetKind === arType;
  const glbPreview = arType === "GLB" ? newAssetUrl ?? (existingAssetMatches ? existing!.arAssetUrl! : null) : null;
  const previewId = isNew ? newHaircutId(length, texture, name) : id;

  const pickFile = (file: File | null, kind: "thumbnail" | "ar") => {
    setFileError(null);
    if (!file) return;
    const problem = kind === "thumbnail" ? validateThumbnail(file) : validateArAsset(file, arType);
    if (problem) {
      setFileError(problem);
      toast.error(problem);
      return;
    }
    if (kind === "thumbnail") setThumbnail(file);
    else setArAsset(file);
  };

  const onSubmit = handleSubmit(async (values) => {
    if ((values.arType === "DEEPAR" || values.arType === "GLB") && !arAsset && !existingAssetMatches) {
      toast.error(`Upload the ${values.arType === "GLB" ? ".glb model" : ".deepar effect"} for this try-on type.`);
      return;
    }
    if (arAsset) {
      const problem = validateArAsset(arAsset, values.arType);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    setSaving(true);
    try {
      const haircutId = isNew ? newHaircutId(values.length, values.texture, values.name) : id!;
      await saveHaircut(
        {
          ...existing,
          ...values,
          id: haircutId,
          imageUrl: existing?.imageUrl ?? "",
          arAssetVersion: existing?.arAssetVersion ?? 0,
        },
        { isNew, thumbnail, arAsset: values.arType === "DEEPAR" || values.arType === "GLB" ? arAsset : null },
      );
      toast.success(isNew ? "Style created." : "Changes saved.", {
        description: "The app picks it up the next time the Home screen loads.",
      });
      router.push("/catalogue");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Link href="/catalogue" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-2 -ml-2" })}>
        <ArrowLeft /> Catalogue
      </Link>
      <PageHeader
        title={isNew ? "New style" : existing?.name ?? "Edit style"}
        description={previewId ? `Id: ${previewId}` : undefined}
        actions={
          <>
            {!isNew && (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create style" : "Save changes"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>What users see on the Home screen and in recommendations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} aria-invalid={Boolean(formState.errors.name)} />
                <FieldError message={formState.errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Why it suits these face shapes</Label>
                <Textarea id="description" rows={4} {...register("description")} />
                <FieldError message={formState.errors.description?.message} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["length", "Hair length", HAIR_LENGTHS],
                    ["texture", "Hair texture", HAIR_TEXTURES],
                    ["genderStyle", "Styled for", GENDER_STYLES],
                    ["treatment", "Treatment", TREATMENTS],
                  ] as const
                ).map(([field, fieldLabel, values]) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{fieldLabel}</Label>
                    <Controller
                      control={control}
                      name={field}
                      render={({ field: f }) => (
                        <OptionSelect
                          id={field}
                          value={f.value}
                          onChange={f.onChange}
                          options={Object.fromEntries(values.map((v) => [v, label(v)]))}
                        />
                      )}
                    />
                  </div>
                ))}
              </div>
              {!isNew && (
                <p className="text-xs text-muted-foreground">
                  Changing length or texture moves the style to another Home row; its id stays the same.
                </p>
              )}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Recommended for face shapes</legend>
                <Controller
                  control={control}
                  name="recommendedFaceShapes"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-4">
                      {FACE_SHAPES.map((shape) => (
                        <label key={shape} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(shape)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked ? [...field.value, shape] : field.value.filter((s) => s !== shape),
                              )
                            }
                          />
                          <FaceShapeTag shape={shape} label={label(shape)} />
                        </label>
                      ))}
                    </div>
                  )}
                />
                <FieldError message={formState.errors.recommendedFaceShapes?.message} />
              </fieldset>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Try-on</CardTitle>
              <CardDescription>How users try this style on live in the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="arType">Try-on type</Label>
                <Controller
                  control={control}
                  name="arType"
                  render={({ field }) => (
                    <OptionSelect
                      id="arType"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        setArAsset(null);
                      }}
                      options={AR_TYPE_LABELS}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">{AR_HINTS[arType]}</p>
              </div>

              {(arType === "DEEPAR" || arType === "GLB") && (
                <div className="space-y-2">
                  <Label htmlFor="arAsset">{arType === "GLB" ? "Model file (.glb)" : "Effect file (.deepar)"}</Label>
                  <Input
                    id="arAsset"
                    type="file"
                    accept={arType === "GLB" ? ".glb,model/gltf-binary" : ".deepar"}
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null, "ar")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {arAsset
                      ? `New file: ${arAsset.name} (${fileSize(arAsset.size)}) — uploaded when you save.`
                      : existingAssetMatches
                        ? `Current file: version ${existing!.arAssetVersion}. Choose a file to replace it.`
                        : "No file uploaded yet. Max 40 MB."}
                  </p>
                </div>
              )}

              {arType === "GLB" && (
                <div className="space-y-3">
                  {glbPreview && <GlbPreview src={glbPreview} />}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {FIT_FIELDS.map(({ key, label: fitLabel, step }) => (
                      <div key={key} className="space-y-1">
                        <Label htmlFor={`fit-${key}`} className="text-xs">
                          {fitLabel}
                        </Label>
                        <Input
                          id={`fit-${key}`}
                          type="number"
                          step={step}
                          {...register(`glbFit.${key}`, { valueAsNumber: true })}
                        />
                      </div>
                    ))}
                  </div>
                  <FieldError message={formState.errors.glbFit ? "Check the fit values." : undefined} />
                </div>
              )}
              {fileError && <FieldError message={fileError} />}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
              <CardDescription>Transparent PNG works best. Max 3 MB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {thumbnailPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailPreview} alt="" className="mx-auto aspect-square w-full max-w-72 rounded-lg bg-muted object-contain" />
              ) : (
                <div className="mx-auto flex aspect-square w-full max-w-72 flex-col items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground">
                  <ImageOff className="size-6" />
                  {existing?.imageUrl?.includes("/drawable/") ? "Bundled in the app only" : "No thumbnail"}
                </div>
              )}
              <Label
                htmlFor="thumbnail"
                className={buttonVariants({ variant: "outline", className: "w-full cursor-pointer" })}
              >
                <Upload /> {thumbnail ? thumbnail.name : "Choose image"}
              </Label>
              <input
                id="thumbnail"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null, "thumbnail")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center justify-between gap-3 text-sm">
                    Visible in the app
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </label>
                )}
              />
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input id="sortOrder" type="number" min={0} {...register("sortOrder", { valueAsNumber: true })} />
                <p className="text-xs text-muted-foreground">Lower numbers appear first within a Home row.</p>
                <FieldError message={formState.errors.sortOrder?.message} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {existing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${existing.name}?`}
          description="This removes the style and its uploaded files. Users' past consultations keep their results but lose the link to this style. To take it out of the app temporarily, hide it instead."
          actionLabel="Delete style"
          destructive
          confirmText={existing.name}
          onConfirm={async () => {
            try {
              await deleteHaircut(existing);
              toast.success(`${existing.name} deleted.`);
              router.push("/catalogue");
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        />
      )}
    </form>
  );
}
