"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { RUN_CLUB_ALLOWED_MIME_TYPES, RUN_CLUB_MAX_IMAGE_BYTES, runClubSubmissionSchema } from "@/lib/run-club/validation";

type FieldErrors = Record<string, string>;
type UploadProof = { publicId: string; secureUrl: string; width: number; height: number; format: string; bytes: number; version: string; signature?: string };

const initialFields = { name: "", contact: "", instagram: "", wilaya: "", caption: "", consentAccepted: false, website: "" };

export function RunClubSubmissionForm({ isClosed }: { isClosed: boolean }) {
  const [fields, setFields] = useState(initialFields);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "uploading" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField(name: keyof typeof initialFields, value: string | boolean) { setFields((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: "" })); }
  function selectFile(nextFile: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setErrors((current) => ({ ...current, proofImage: "" }));
    if (!nextFile) return;
    if (!RUN_CLUB_ALLOWED_MIME_TYPES.includes(nextFile.type as typeof RUN_CLUB_ALLOWED_MIME_TYPES[number])) { setErrors((current) => ({ ...current, proofImage: "Upload a JPG, PNG, or WEBP image." })); return; }
    if (nextFile.size > RUN_CLUB_MAX_IMAGE_BYTES) { setErrors((current) => ({ ...current, proofImage: "Image must be 5MB or smaller." })); return; }
    setFile(nextFile); setPreview(URL.createObjectURL(nextFile));
  }
  async function uploadProof(selectedFile: File): Promise<UploadProof> {
    const signatureResponse = await fetch("/api/run-club/upload-signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileType: selectedFile.type, fileSize: selectedFile.size }) });
    const signaturePayload = await signatureResponse.json();
    if (!signatureResponse.ok || !signaturePayload.ok) throw new Error(signaturePayload.message || "Upload failed.");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("api_key", signaturePayload.apiKey);
    formData.append("timestamp", String(signaturePayload.timestamp));
    formData.append("public_id", signaturePayload.publicId);
    formData.append("signature", signaturePayload.signature);
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`, { method: "POST", body: formData });
    const upload = await cloudinaryResponse.json();
    if (!cloudinaryResponse.ok) throw new Error("Image upload failed. Try again.");
    return { publicId: upload.public_id, secureUrl: upload.secure_url, width: upload.width, height: upload.height, format: upload.format, bytes: upload.bytes, version: String(upload.version), signature: upload.signature };
  }
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (isClosed || status === "uploading" || status === "submitting") return;
    if (!file) { setErrors({ proofImage: "Run proof image is required." }); return; }
    setStatus("uploading"); setMessage(""); setErrors({});
    try {
      const proofImage = await uploadProof(file);
      const payload = { ...fields, proofImage };
      const parsed = runClubSubmissionSchema.safeParse(payload);
      if (!parsed.success) { setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid value."]))); setStatus("idle"); return; }
      setStatus("submitting");
      const response = await fetch("/api/run-club/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setErrors(result.fieldErrors ?? {}); throw new Error(result.message || "Submission failed."); }
      setFields(initialFields); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); setStatus("success"); setMessage("Your entry is pending review. It will only appear publicly after approval.");
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Submission failed. Try again."); }
  }
  const processing = status === "uploading" || status === "submitting";
  return <form className="runClubForm" onSubmit={onSubmit} noValidate>
    <input className="runClubHoneypot" tabIndex={-1} autoComplete="off" value={fields.website} onChange={(event) => updateField("website", event.target.value)} aria-hidden="true" />
    <label>Name<input value={fields.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(errors.name)} required />{errors.name && <span>{errors.name}</span>}</label>
    <label>Email or phone<input value={fields.contact} onChange={(event) => updateField("contact", event.target.value)} aria-invalid={Boolean(errors.contact)} required />{errors.contact && <span>{errors.contact}</span>}</label>
    <div className="runClubForm__row"><label>Instagram<input value={fields.instagram} onChange={(event) => updateField("instagram", event.target.value)} /></label><label>Wilaya<input value={fields.wilaya} onChange={(event) => updateField("wilaya", event.target.value)} /></label></div>
    <label>Run caption<textarea value={fields.caption} maxLength={280} onChange={(event) => updateField("caption", event.target.value)} />{errors.caption && <span>{errors.caption}</span>}</label>
    <div className="runClubDropzone" onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files[0] ?? null); }} onDragOver={(event) => event.preventDefault()}>
      {preview ? <Image src={preview} alt="Selected run proof preview" width={320} height={220} unoptimized /> : <p>Drag your proof image here, or choose a file.</p>}
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      <div><button type="button" className="button" onClick={() => fileInputRef.current?.click()}>{file ? "REPLACE IMAGE" : "CHOOSE IMAGE"}</button>{file && <button type="button" className="button" onClick={() => selectFile(null)}>REMOVE</button>}</div>
      {errors.proofImage && <span>{errors.proofImage}</span>}
    </div>
    <label className="runClubConsent"><input type="checkbox" checked={fields.consentAccepted} onChange={(event) => updateField("consentAccepted", event.target.checked)} />I confirm that I own this content and allow 213 RUN to display it if my submission is approved.{errors.consentAccepted && <span>{errors.consentAccepted}</span>}</label>
    <button className="button button--lime" type="submit" disabled={isClosed || processing}>{isClosed ? "SUBMISSIONS CLOSED" : processing ? (status === "uploading" ? "UPLOADING PROOF..." : "SUBMITTING...") : "SUBMIT RUN →"}</button>
    {status === "success" && <div className="runClubFormMessage is-success"><strong>RUN SUBMITTED.</strong><p>{message}</p></div>}
    {status === "error" && <div className="runClubFormMessage is-error"><p>{message}</p></div>}
  </form>;
}
