"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { getDeviceId, setDeviceId, setDisplayName } from "@/lib/client/device";
import { useRouter } from "next/navigation";

export default function JoinClient({ roomId }: { roomId: string }) {
  const router = useRouter();

  const [displayName, setDn] = useState("");
  const [deviceId, setDid] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDid(getDeviceId());
  }, []);

  async function join() {
    const dn = displayName.trim();
    const did = deviceId.trim();
    if (!dn) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/join`, {
        method: "POST",
        json: {
          displayName: dn,
          deviceId: did || undefined, // 空なら送らない
        },
      });

      setDisplayName(dn);
      if (did) setDeviceId(did);

      router.replace(`/r/${roomId}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md p-4 space-y-4">
        <h1 className="text-xl font-bold">参加する</h1>
        <div className="text-xs text-gray-600 break-all">Room: {roomId}</div>

        <div className="rounded-xl bg-white p-4 shadow space-y-3">
          {/* 招待トークン欄は削除 */}

          <label className="block text-sm">
            ニックネーム
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={displayName}
              onChange={(e) => setDn(e.target.value)}
              placeholder="例: ken"
            />
          </label>

          <label className="block text-sm">
            端末ID（通常は空でOK）
            <input
              className="mt-1 w-full rounded-lg border p-2 font-mono text-xs"
              value={deviceId}
              onChange={(e) => setDid(e.target.value)}
              placeholder="dev-2 など（テスト用）"
            />
          </label>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <button
            className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
            onClick={join}
            disabled={busy || !displayName.trim()}
          >
            参加
          </button>
        </div>
      </div>
    </div>
  );
}
