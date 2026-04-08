"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const DB_NAME = "sneaker-try-on";
const STORE_NAME = "keyval";
const HISTORY_KEY = "sneaker-try-on:generations:v1";

export type GenerationResponse = {
  image: {
    mimeType: string;
    data: string;
    dataUrl: string;
  };
  model: string;
  prompt: string;
  text?: string;
  createdAt: string;
};

export type HistoryEntry = {
  id: string;
  imageDataUrl: string;
  createdAt: string;
  model: string;
  prompt: string;
  personName?: string;
  shoeSource?: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDel(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function useSneakerTryOn() {
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [shoeFile, setShoeFile] = useState<File | null>(null);
  const [shoeImageUrl, setShoeImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const canSubmit = personFile && (shoeFile || shoeImageUrl.trim()) && !isGenerating;

  const personPreviewUrl = useObjectUrl(personFile);
  const shoePreviewUrl = useObjectUrl(shoeFile);

  useEffect(() => {
    let cancelled = false;
    dbGet<HistoryEntry[]>(HISTORY_KEY).then((stored) => {
      if (!cancelled && stored && Array.isArray(stored)) {
        setHistory(stored.slice(0, 10));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    setError("");
    setResult(null);

    if (!personFile) {
      setError("Upload a photo of the person first.");
      return;
    }

    if (!shoeFile && !shoeImageUrl.trim()) {
      setError("Upload a sneaker image or paste a direct image URL.");
      return;
    }

    setIsGenerating(true);

    const formData = new FormData();
    formData.append("personImage", personFile);
    if (shoeFile) {
      formData.append("shoeImage", shoeFile);
    } else {
      formData.append("shoeImageUrl", shoeImageUrl.trim());
    }
    formData.append("aspectRatio", "3:4");
    formData.append("imageSize", "2K");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Generation failed.");
      }

      const generation = payload as GenerationResponse;
      setResult(generation);

      const nextEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        imageDataUrl: generation.image.dataUrl,
        createdAt: generation.createdAt,
        model: generation.model,
        prompt: generation.prompt,
        personName: personFile.name,
        shoeSource: shoeFile?.name || shoeImageUrl.trim(),
      };
      const nextHistory = [nextEntry, ...history].slice(0, 10);
      setHistory(nextHistory);
      await dbSet(HISTORY_KEY, nextHistory);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    dbDel(HISTORY_KEY);
  }

  return {
    personFile,
    setPersonFile,
    shoeFile,
    setShoeFile,
    shoeImageUrl,
    setShoeImageUrl,
    isGenerating,
    error,
    result,
    history,
    canSubmit,
    personPreviewUrl,
    shoePreviewUrl,
    handleSubmit,
    clearHistory,
  };
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return useMemo(() => url, [url]);
}
